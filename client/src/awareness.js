export const userColors = [
  '#e91e63', '#2196f3', '#4caf50', '#ff9800', 
  '#9c27b0', '#00bcd4', '#ff5722', '#8bc34a'
];

export function getUserColor(clientId) {
  return userColors[clientId % userColors.length];
}

export function setupAwareness(awareness) {
  const usersPanel = document.getElementById('users-panel');

  const updateUsers = () => {
    const states = Array.from(awareness.getStates().values());
    usersPanel.innerHTML = '';
    
    states.forEach(state => {
      if (state.user) {
        const tag = document.createElement('div');
        tag.className = 'user-tag';
        
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.backgroundColor = state.user.color;
        
        const name = document.createTextNode(state.user.name);
        
        tag.appendChild(dot);
        tag.appendChild(name);
        usersPanel.appendChild(tag);
      }
    });
  };

  awareness.on('change', updateUsers);
  updateUsers();

  return () => {
    awareness.off('change', updateUsers);
  };
}

export function updateConnectionStatus(connected) {
  const dot = document.getElementById('connection-status');
  if (connected) {
    dot.classList.remove('disconnected');
    dot.classList.add('connected');
  } else {
    dot.classList.remove('connected');
    dot.classList.add('disconnected');
  }
}
