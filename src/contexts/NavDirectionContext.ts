import { createContext, useContext } from 'react';

export const NavDirectionContext = createContext<number>(0);

export const useNavDirection = () => useContext(NavDirectionContext);
