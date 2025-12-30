import { TProject } from "@/types/project";
import { MediaFile } from "@/types/media";
import { RemoteProjectsAdapter } from "./remote-projects-adapter";
import { CacheAdapter } from "./cache-adapter";
import {
  MediaFileData,
  SerializedProject,
  SerializedScene,
} from "./types";
import { TimelineTrack } from "@/types/timeline";
import { SavedSoundsData } from "@/types/sounds";

class StorageService {
  private projectsAdapter: RemoteProjectsAdapter;
  private mediaCache: CacheAdapter<MediaFileData[]>;
  private timelinesCache: CacheAdapter<TimelineTrack[]>;

  constructor() {
    // Use remote adapter for projects (server-backed)
    this.projectsAdapter = new RemoteProjectsAdapter();

    // Cache for media metadata (5 minutes TTL)
    this.mediaCache = new CacheAdapter<MediaFileData[]>("media", 300000);

    // Cache for timelines (1 minute TTL - actively editing)
    this.timelinesCache = new CacheAdapter<TimelineTrack[]>("timelines", 60000);
  }

  // Project operations
  async saveProject({ project }: { project: TProject }): Promise<void> {
    // Convert TProject to serializable format
    const serializedScenes: SerializedScene[] = project.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      isMain: scene.isMain,
      createdAt: scene.createdAt.toISOString(),
      updatedAt: scene.updatedAt.toISOString(),
    }));

    const serializedProject: SerializedProject = {
      id: project.id,
      name: project.name,
      thumbnail: project.thumbnail,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      scenes: serializedScenes,
      currentSceneId: project.currentSceneId,
      backgroundColor: project.backgroundColor,
      backgroundType: project.backgroundType,
      blurIntensity: project.blurIntensity,
      bookmarks: project.bookmarks,
      fps: project.fps,
      canvasSize: project.canvasSize,
      canvasMode: project.canvasMode,
    };

    await this.projectsAdapter.set(project.id, serializedProject);
  }

  async loadProject({ id }: { id: string }): Promise<TProject | null> {
    const serializedProject = await this.projectsAdapter.get(id);

    if (!serializedProject) return null;

    // Now convert serialized scenes back to Scene objects
    const scenes =
      serializedProject.scenes?.map((scene) => ({
        id: scene.id,
        name: scene.name,
        isMain: scene.isMain,
        createdAt: new Date(scene.createdAt),
        updatedAt: new Date(scene.updatedAt),
      })) || [];

    // Convert back to TProject format
    const project = {
      id: serializedProject.id,
      name: serializedProject.name,
      thumbnail: serializedProject.thumbnail,
      createdAt: new Date(serializedProject.createdAt),
      updatedAt: new Date(serializedProject.updatedAt),
      scenes,
      currentSceneId: serializedProject.currentSceneId || "",
      backgroundColor: serializedProject.backgroundColor,
      backgroundType: serializedProject.backgroundType,
      blurIntensity: serializedProject.blurIntensity,
      bookmarks: serializedProject.bookmarks,
      fps: serializedProject.fps,
      canvasSize: serializedProject.canvasSize,
      canvasMode: serializedProject.canvasMode,
    };
    return project;
  }

  async loadAllProjects(): Promise<TProject[]> {
    const serializedProjects = await this.projectsAdapter.loadAll();
    const projects: TProject[] = [];

    for (const serializedProject of serializedProjects) {
      // Convert serialized scenes back to Scene objects
      const scenes =
        serializedProject.scenes?.map((scene) => ({
          id: scene.id,
          name: scene.name,
          isMain: scene.isMain,
          createdAt: new Date(scene.createdAt),
          updatedAt: new Date(scene.updatedAt),
        })) || [];

      // Convert back to TProject format
      const project: TProject = {
        id: serializedProject.id,
        name: serializedProject.name,
        thumbnail: serializedProject.thumbnail,
        createdAt: new Date(serializedProject.createdAt),
        updatedAt: new Date(serializedProject.updatedAt),
        scenes,
        currentSceneId: serializedProject.currentSceneId || "",
        backgroundColor: serializedProject.backgroundColor,
        backgroundType: serializedProject.backgroundType,
        blurIntensity: serializedProject.blurIntensity,
        bookmarks: serializedProject.bookmarks,
        fps: serializedProject.fps,
        canvasSize: serializedProject.canvasSize,
        canvasMode: serializedProject.canvasMode,
      };
      projects.push(project);
    }

    // Sort by last updated (most recent first)
    return projects.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async deleteProject({ id }: { id: string }): Promise<void> {
    await this.projectsAdapter.remove(id);
  }

  // Media operations (R2 + PostgreSQL + Cache)
  async saveMediaFile({
    projectId,
    mediaItem,
  }: {
    projectId: string;
    mediaItem: MediaFile;
  }): Promise<void> {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append("file", mediaItem.file);
    formData.append("id", mediaItem.id);
    formData.append("projectId", projectId);
    formData.append("name", mediaItem.name);
    formData.append("type", mediaItem.type);

    if (mediaItem.width) formData.append("width", mediaItem.width.toString());
    if (mediaItem.height) formData.append("height", mediaItem.height.toString());
    if (mediaItem.duration) formData.append("duration", mediaItem.duration.toString());
    if (mediaItem.ephemeral) formData.append("ephemeral", "true");
    if (mediaItem.sourceStickerIconName) {
      formData.append("sourceStickerIconName", mediaItem.sourceStickerIconName);
    }

    // Upload to R2 and save metadata to PostgreSQL
    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload media: ${response.statusText}`);
    }

    // Invalidate cache to force refresh
    await this.mediaCache.invalidate(projectId);
  }

  async loadMediaFile({
    projectId,
    id,
  }: {
    projectId: string;
    id: string;
  }): Promise<MediaFile | null> {
    // Load all media for the project (uses cache)
    const allMedia = await this.loadAllMediaFiles({ projectId });

    // Find the specific media item
    const mediaData = allMedia.find((item) => item.id === id);
    if (!mediaData) return null;

    return mediaData;
  }

  async loadAllMediaFiles({
    projectId,
  }: {
    projectId: string;
  }): Promise<MediaFile[]> {
    // Try cache first
    let cachedMetadata = await this.mediaCache.get(projectId);

    if (!cachedMetadata) {
      // Cache miss - fetch from server
      const response = await fetch(`/api/media?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error(`Failed to load media: ${response.statusText}`);
      }

      const data = await response.json();
      cachedMetadata = data.media || [];

      // Update cache only if we have data
      if (cachedMetadata.length > 0) {
        await this.mediaCache.set(projectId, cachedMetadata, 1);
      }
    }

    // Convert metadata to MediaFile objects
    // Note: Files are now stored in R2, so we don't need to load file blobs
    // The url field contains the R2 public URL
    const mediaFiles: MediaFile[] = cachedMetadata.map((metadata) => ({
      id: metadata.id,
      name: metadata.name,
      type: metadata.type,
      url: metadata.url, // R2 URL
      file: new File([], metadata.name), // Dummy file object for compatibility
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      ephemeral: metadata.ephemeral,
      sourceStickerIconName: metadata.sourceStickerIconName,
    }));

    return mediaFiles;
  }

  async deleteMediaFile({
    projectId,
    id,
  }: {
    projectId: string;
    id: string;
  }): Promise<void> {
    // Delete from PostgreSQL (file stays in R2 for now)
    const response = await fetch(`/api/media/${id}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete media: ${response.statusText}`);
    }

    // Invalidate cache
    await this.mediaCache.invalidate(projectId);
  }

  async deleteProjectMedia({
    projectId,
  }: {
    projectId: string;
  }): Promise<void> {
    // Get all media for the project
    const allMedia = await this.loadAllMediaFiles({ projectId });

    // Delete each media item
    await Promise.all(
      allMedia.map((media) =>
        this.deleteMediaFile({ projectId, id: media.id })
      )
    );

    // Clear cache
    await this.mediaCache.invalidate(projectId);
  }

  // Timeline operations (PostgreSQL + Cache)
  async saveTimeline({
    sceneId,
    tracks,
  }: {
    sceneId: string;
    tracks: TimelineTrack[];
  }): Promise<void> {
    // Save to PostgreSQL via API
    const response = await fetch("/api/timelines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneId, tracks }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save timeline: ${response.statusText}`);
    }

    // Update cache
    await this.timelinesCache.set(sceneId, tracks, 1);
  }

  async loadTimeline({
    sceneId,
  }: {
    sceneId: string;
  }): Promise<TimelineTrack[] | null> {
    // Try cache first
    let cachedTracks = await this.timelinesCache.get(sceneId);

    if (!cachedTracks) {
      // Cache miss - fetch from server
      const response = await fetch(`/api/timelines?sceneId=${sceneId}`);

      if (response.status === 404) {
        return null; // Timeline doesn't exist yet
      }

      if (!response.ok) {
        throw new Error(`Failed to load timeline: ${response.statusText}`);
      }

      const data = await response.json();
      cachedTracks = data.tracks || [];

      // Update cache only if we have tracks
      if (cachedTracks.length > 0) {
        await this.timelinesCache.set(sceneId, cachedTracks, 1);
      }
    }

    return cachedTracks;
  }

  async deleteProjectTimeline({
    sceneId,
  }: {
    sceneId: string;
  }): Promise<void> {
    // Timelines are deleted automatically when scenes are deleted (CASCADE)
    // Just invalidate cache
    await this.timelinesCache.invalidate(sceneId);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    // Clear all projects
    await this.projectsAdapter.clear();

    // Clear caches
    await this.mediaCache.clear();
    await this.timelinesCache.clear();
  }

  async getStorageInfo(): Promise<{
    projects: number;
    isIndexedDBSupported: boolean;
  }> {
    const projectIds = await this.projectsAdapter.list();

    return {
      projects: projectIds.length,
      isIndexedDBSupported: this.isIndexedDBSupported(),
    };
  }

  async getProjectStorageInfo({
    projectId,
    sceneId,
  }: {
    projectId: string;
    sceneId?: string;
  }): Promise<{
    mediaItems: number;
    hasTimeline: boolean;
  }> {
    const [media, timeline] = await Promise.all([
      this.loadAllMediaFiles({ projectId }),
      sceneId ? this.loadTimeline({ sceneId }) : Promise.resolve(null),
    ]);

    return {
      mediaItems: media.length,
      hasTimeline: !!timeline,
    };
  }

  // Saved sounds feature removed - keeping stub methods for backwards compatibility
  async loadSavedSounds(): Promise<SavedSoundsData> {
    return { sounds: [], lastModified: new Date().toISOString() };
  }

  async saveSoundEffect(): Promise<void> {
    // No-op - feature removed
  }

  async removeSavedSound(): Promise<void> {
    // No-op - feature removed
  }

  async isSoundSaved(): Promise<boolean> {
    return false;
  }

  async clearSavedSounds(): Promise<void> {
    // No-op - feature removed
  }

  // Check browser support
  isIndexedDBSupported(): boolean {
    return "indexedDB" in window;
  }

  isFullySupported(): boolean {
    return this.isIndexedDBSupported();
  }
}

// Export singleton instance
export const storageService = new StorageService();
export { StorageService };
