import { NavigateFunction, To, NavigateOptions } from 'react-router-dom';

export const debugNavigation = (navigate: NavigateFunction): NavigateFunction => {
  return ((to: To, options?: NavigateOptions) => {
    console.log('[Navigation] Attempting navigation:', {
      to,
      options,
      currentPath: window.location.pathname,
      auth: {
        token: !!localStorage.getItem('token'),
        role: localStorage.getItem('userRole'),
        isAuthenticated: localStorage.getItem('userEmail') !== null
      }
    });
    
    return navigate(to, options);
  }) as NavigateFunction;
};
