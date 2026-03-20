// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

interface Question {
  type: string;
  count: number;
  marks: number;
}

interface AssignmentPayload {
  assignmentName: string;
  dueDate: string;
  questions: Question[];
  additionalInfo: string;
}

/**
 * Create a new assignment with optional file upload
 */
export const createAssignment = async (
  formData: FormData
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/assignments/create`, {
      method: 'POST',
      body: formData,
    });

    const data: ApiResponse<any> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create assignment');
    }

    return data;
  } catch (error) {
    console.error('Error creating assignment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Get all assignments
 */
export const getAssignments = async (): Promise<ApiResponse<any[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/assignments/all`, {
      method: 'GET',
    });

    const data: ApiResponse<any[]> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch assignments');
    }

    return data;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: [],
    };
  }
};

/**
 * Get assignment by ID
 */
export const getAssignmentById = async (id: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'GET',
    });

    const data: ApiResponse<any> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch assignment');
    }

    return data;
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Update an assignment
 */
export const updateAssignment = async (
  id: string,
  payload: AssignmentPayload
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: ApiResponse<any> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update assignment');
    }

    return data;
  } catch (error) {
    console.error('Error updating assignment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (id: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'DELETE',
    });

    const data: ApiResponse<any> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete assignment');
    }

    return data;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Check server health
 */
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Server health check failed:', error);
    return false;
  }
};
