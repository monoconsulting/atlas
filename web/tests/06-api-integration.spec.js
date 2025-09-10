const { test, expect } = require('@playwright/test');

test.describe('API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should successfully call health endpoint', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/health');
        return {
          ok: res.ok,
          status: res.status,
          data: await res.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('ok', true);
    expect(response.data).toHaveProperty('message');
  });

  test('should successfully call info endpoint', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/info');
        return {
          ok: res.ok,
          status: res.status,
          data: await res.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('ok', true);
    expect(response.data).toHaveProperty('data');
    
    // Check expected info fields
    const infoData = response.data.data;
    expect(infoData).toHaveProperty('base_dir');
    expect(infoData).toHaveProperty('tasks_file');
    expect(infoData).toHaveProperty('current_tag');
    expect(infoData).toHaveProperty('project_name');
  });

  test('should successfully fetch tasks list', async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/tasks');
        return {
          ok: res.ok,
          status: res.status,
          data: await res.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('ok', true);
    expect(response.data).toHaveProperty('data');
    expect(Array.isArray(response.data.data)).toBe(true);
    
    // If tasks exist, check structure
    if (response.data.data.length > 0) {
      const firstTask = response.data.data[0];
      expect(firstTask).toHaveProperty('id');
      expect(firstTask).toHaveProperty('title');
      expect(firstTask).toHaveProperty('status');
      expect(firstTask).toHaveProperty('priority');
    }
  });

  test('should create new task via API', async ({ page }) => {
    const taskData = {
      title: 'API Test Task',
      description: 'Testing task creation via API',
      priority: 'medium',
      status: 'todo',
      assigned_to: 'API Tester'
    };

    const response = await page.evaluate(async (data) => {
      try {
        const res = await fetch('/task', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        return {
          ok: res.ok,
          status: res.status,
          data: await res.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, taskData);

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('ok', true);
    expect(response.data).toHaveProperty('data');
    
    const createdTask = response.data.data;
    expect(createdTask).toHaveProperty('id');
    expect(createdTask.title).toBe(taskData.title);
    expect(createdTask.description).toBe(taskData.description);
    expect(createdTask.priority).toBe(taskData.priority);
    expect(createdTask.status).toBe(taskData.status);
  });

  test('should get specific task by ID', async ({ page }) => {
    // First create a task to ensure we have one
    const createResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Get Task Test',
            description: 'Testing get task by ID',
            priority: 'low',
            status: 'todo'
          })
        });
        return await res.json();
      } catch (error) {
        return { error: error.message };
      }
    });

    if (createResponse.ok && createResponse.data) {
      const taskId = createResponse.data.id;
      
      // Now fetch the specific task
      const getResponse = await page.evaluate(async (id) => {
        try {
          const res = await fetch(`/task/${id}`);
          return {
            ok: res.ok,
            status: res.status,
            data: await res.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      }, taskId);

      expect(getResponse.ok).toBe(true);
      expect(getResponse.data).toHaveProperty('ok', true);
      expect(getResponse.data.data.id).toBe(taskId);
      expect(getResponse.data.data.title).toBe('Get Task Test');
    }
  });

  test('should update task via PATCH API', async ({ page }) => {
    // First create a task
    const createResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Update Test Task',
            description: 'Original description',
            priority: 'low',
            status: 'todo'
          })
        });
        return await res.json();
      } catch (error) {
        return { error: error.message };
      }
    });

    if (createResponse.ok && createResponse.data) {
      const taskId = createResponse.data.id;
      
      // Update the task
      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description',
        priority: 'high',
        status: 'in-progress'
      };

      const updateResponse = await page.evaluate(async ({ id, data }) => {
        try {
          const res = await fetch(`/task/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return {
            ok: res.ok,
            status: res.status,
            data: await res.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      }, { id: taskId, data: updateData });

      expect(updateResponse.ok).toBe(true);
      expect(updateResponse.data).toHaveProperty('ok', true);
      
      const updatedTask = updateResponse.data.data;
      expect(updatedTask.title).toBe(updateData.title);
      expect(updatedTask.description).toBe(updateData.description);
      expect(updatedTask.priority).toBe(updateData.priority);
      expect(updatedTask.status).toBe(updateData.status);
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Test 404 for non-existent task
    const notFoundResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/task/99999');
        return {
          ok: res.ok,
          status: res.status,
          data: await res.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(notFoundResponse.ok).toBe(false);
    expect(notFoundResponse.status).toBe(404);
  });

  test('should validate request data', async ({ page }) => {
    // Test creating task with invalid data
    const invalidTaskData = {
      title: '', // Empty title should be invalid
      priority: 'invalid-priority',
      status: 'invalid-status'
    };

    const response = await page.evaluate(async (data) => {
      try {
        const res = await fetch('/task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return {
          ok: res.ok,
          status: res.status,
          data: await res.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, invalidTaskData);

    expect(response.ok).toBe(false);
    expect([400, 422]).toContain(response.status); // Bad request or validation error
  });

  test('should handle concurrent API requests', async ({ page }) => {
    // Create multiple tasks concurrently
    const taskPromises = [];
    for (let i = 0; i < 3; i++) {
      const promise = page.evaluate(async (index) => {
        try {
          const res = await fetch('/task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `Concurrent Task ${index}`,
              description: `Testing concurrent creation ${index}`,
              priority: 'medium',
              status: 'todo'
            })
          });
          return {
            index,
            ok: res.ok,
            data: await res.json()
          };
        } catch (error) {
          return { index, error: error.message };
        }
      }, i);
      
      taskPromises.push(promise);
    }

    const results = await Promise.all(taskPromises);
    
    // All requests should succeed
    results.forEach((result, index) => {
      expect(result.ok).toBe(true);
      expect(result.data.ok).toBe(true);
      expect(result.data.data.title).toBe(`Concurrent Task ${index}`);
    });
  });

  test('should handle network timeouts gracefully', async ({ page }) => {
    // This test simulates slow network by intercepting requests
    await page.route('/tasks', async (route) => {
      // Delay response to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 100));
      route.continue();
    });

    const startTime = Date.now();
    
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/tasks');
        return {
          ok: res.ok,
          data: await res.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    const endTime = Date.now();
    
    // Request should still succeed despite delay
    expect(response.ok).toBe(true);
    expect(endTime - startTime).toBeGreaterThan(100);
  });

  test('should maintain data consistency during operations', async ({ page }) => {
    // Get initial task count
    const initialResponse = await page.evaluate(async () => {
      const res = await fetch('/tasks');
      const data = await res.json();
      return data.data.length;
    });

    // Create a new task
    await page.evaluate(async () => {
      await fetch('/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Consistency Test Task',
          description: 'Testing data consistency',
          priority: 'medium',
          status: 'todo'
        })
      });
    });

    // Verify count increased by 1
    const finalResponse = await page.evaluate(async () => {
      const res = await fetch('/tasks');
      const data = await res.json();
      return data.data.length;
    });

    expect(finalResponse).toBe(initialResponse + 1);
  });
});