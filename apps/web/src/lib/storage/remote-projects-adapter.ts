import { SerializedProject } from "./types";

/**
 * Remote adapter for project storage that communicates with the server API
 */
export class RemoteProjectsAdapter {
  private baseUrl: string;

  constructor(baseUrl = "/api/projects") {
    this.baseUrl = baseUrl;
  }

  async get(id: string): Promise<SerializedProject | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.statusText}`);
      }

      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error("Failed to get project:", error);
      throw error;
    }
  }

  async set(id: string, value: SerializedProject): Promise<void> {
    try {
      // Check if project exists by trying to fetch it
      const existingProject = await this.get(id);

      if (existingProject) {
        // Update existing project
        const response = await fetch(`${this.baseUrl}/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(value),
        });

        if (!response.ok) {
          throw new Error(`Failed to update project: ${response.statusText}`);
        }
      } else {
        // Create new project
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(value),
        });

        if (!response.ok) {
          throw new Error(`Failed to create project: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Failed to save project:", error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      throw error;
    }
  }

  async list(): Promise<string[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to list projects: ${response.statusText}`);
      }

      const data = await response.json();
      return data.projects.map((project: SerializedProject) => project.id);
    } catch (error) {
      console.error("Failed to list projects:", error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      // Get all project IDs and delete them one by one
      const ids = await this.list();
      await Promise.all(ids.map((id) => this.remove(id)));
    } catch (error) {
      console.error("Failed to clear projects:", error);
      throw error;
    }
  }

  async loadAll(): Promise<SerializedProject[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to list projects: ${response.statusText}`);
      }

      const data = await response.json();
      return data.projects;
    } catch (error) {
      console.error("Failed to load all projects:", error);
      throw error;
    }
  }
}
