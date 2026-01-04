// src/utils/navigation.ts
type NavigateFn = (path: string) => void;

export const navigation = {
  navigate: null as NavigateFn | null,
};

export const setGlobalNavigate = (fn: NavigateFn) => {
  navigation.navigate = fn;
};