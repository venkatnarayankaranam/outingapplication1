export const normalizeRole = (role: string): string => {
  const roleMap: { [key: string]: string } = {
    'gate': 'security',
    'security': 'security',
    'maingate': 'security'
  };
  return roleMap[role.toLowerCase()] || role;
};

export const getDashboardPath = (role: string): string => {
  if (role === 'gate' || role === 'security' || role === 'maingate') {
    return '/dashboard/security';
  }
  return `/dashboard/${role}`;
};
