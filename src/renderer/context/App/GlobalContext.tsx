/* eslint-disable import/prefer-default-export */
import { createContext } from 'react';
import { GlobalContextType } from '../../@types/emusik';

export const GlobalContext = createContext<GlobalContextType | null>(null);
