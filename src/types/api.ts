/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  status_code: number;
  message: string;
  data: T;
}
