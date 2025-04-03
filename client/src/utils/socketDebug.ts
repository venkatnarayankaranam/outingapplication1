export const debugSocket = (socket: any) => {
  const events = ['connect', 'connect_error', 'disconnect', 'error'];
  
  events.forEach(event => {
    socket.on(event, (...args: any[]) => {
      console.log(`[Socket][${event}]`, ...args);
    });
  });

  // Debug middleware
  socket.onAny((event: string, ...args: any[]) => {
    console.log(`[Socket][${event}]`, ...args);
  });
};
