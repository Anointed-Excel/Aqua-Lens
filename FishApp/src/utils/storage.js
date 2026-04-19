import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveAuth = async (accessToken, refreshToken, user) => {
  await AsyncStorage.multiSet([
    ['access_token', accessToken],
    ['refresh_token', refreshToken],
    ['user', JSON.stringify(user)],
  ]);
};

export const clearAuth = async () => {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
};

export const getUser = async () => {
  const raw = await AsyncStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
};

export const isLoggedIn = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return !!token;
};
