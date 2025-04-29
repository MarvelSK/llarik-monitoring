
import { HttpMethod, HttpRequestConfig } from "@/types/check";
import { toast } from "sonner";

/**
 * Executes an HTTP request based on the provided configuration
 */
export async function executeHttpRequest(config: HttpRequestConfig) {
  try {
    console.log("Executing HTTP request with config:", config);

    // Prepare request options
    const requestOptions: RequestInit = {
      method: config.method,
      headers: {},
      redirect: "follow",
      mode: "cors",
      cache: "no-cache",
      referrerPolicy: "no-referrer",
    };

    // Add headers if specified
    if (config.headers && Object.keys(config.headers).length > 0) {
      requestOptions.headers = { ...config.headers };
    }

    // Add Content-Type header for methods that typically include bodies
    if (['POST', 'PUT', 'PATCH'].includes(config.method)) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'Content-Type': 'application/json',
      };
    }

    // Add authentication if specified
    if (config.auth) {
      if (config.auth.type === 'basic') {
        const basicAuthValue = `Basic ${btoa(`${config.auth.username || ''}:${config.auth.password || ''}`)}`;
        requestOptions.headers = {
          ...requestOptions.headers,
          'Authorization': basicAuthValue,
        };
      } else if (config.auth.type === 'bearer' && config.auth.token) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Authorization': `Bearer ${config.auth.token}`,
        };
      }
    }

    // Add body for methods that typically include bodies
    if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.body) {
      requestOptions.body = config.body;
    }

    // Build URL with any query parameters
    let url = config.url;
    if (config.params && Object.keys(config.params).length > 0) {
      const urlObj = new URL(url);
      Object.keys(config.params).forEach(key => {
        urlObj.searchParams.append(key, config.params?.[key] || '');
      });
      url = urlObj.toString();
    }

    // Start execution timer
    const startTime = Date.now();

    // Execute the request with a timeout (10 seconds)
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
    });

    const fetchPromise = fetch(url, requestOptions);
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    // Calculate duration
    const duration = (Date.now() - startTime) / 1000; // in seconds

    // Process response
    const result = {
      status: response.status,
      duration,
      success: config.successCodes.includes(response.status),
    };

    console.log("HTTP request completed:", result);
    return result;
  } catch (error) {
    console.error("Error executing HTTP request:", error);
    return {
      status: 0,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Executes an HTTP request for a check and returns the result
 */
export async function executeCheckHttpRequest(checkId: string, httpConfig: HttpRequestConfig) {
  try {
    const result = await executeHttpRequest(httpConfig);
    return {
      success: result.success,
      status: result.status === 0 ? 'failure' : (result.success ? 'success' : 'failure'),
      duration: result.duration,
      responseCode: result.status,
      method: httpConfig.method,
      requestUrl: httpConfig.url,
      error: result.error,
    };
  } catch (error) {
    console.error("Error executing HTTP request for check:", checkId, error);
    toast.error(`Failed to execute HTTP request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      status: 'failure' as const,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
