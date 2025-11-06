export const navigateToProfile = (userId: string, currentUserId: string | undefined) => {
  if (!userId) return;

  if (userId === currentUserId) {
    window.location.hash = '/profile';
  } else {
    window.location.hash = `/users/${userId}`;
  }
};
