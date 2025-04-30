
import { HttpConfig } from "@/types/check";

export async function executeHttpRequest(config: HttpConfig): Promise<{
  status: 'success' | 'failure';
  statusCode?: number;
  responseTime: number;
  responseBody?: string;
  error?: string;
}> {
  try {
    const startTime = performance.now();
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method: config.method,
      headers: config.headers ? new Headers(config.headers) : undefined,
    };
    
    // Add body for non-GET requests if provided
    if (config.body && config.method !== 'GET' && config.method !== 'HEAD') {
      requestOptions.body = config.body;
    }
    
    // Build URL with params if any
    let url = config.url;
    if (config.params && Object.keys(config.params).length > 0) {
      const urlObj = new URL(url);
      Object.entries(config.params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value);
      });
      url = urlObj.toString();
    }
    
    // Execute the request
    const response = await fetch(url, requestOptions);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    // Get response body if possible
    let responseBody: string | undefined;
    try {
      responseBody = await response.text();
    } catch (e) {
      console.error("Failed to read response body:", e);
    }
    
    // Check if status code is in the success codes list
    const isSuccess = config.successCodes.includes(response.status);
    
    return {
      status: isSuccess ? 'success' : 'failure',
      statusCode: response.status,
      responseTime,
      responseBody: responseBody,
    };
  } catch (error) {
    console.error("HTTP request execution error:", error);
    return {
      status: 'failure',
      responseTime: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
