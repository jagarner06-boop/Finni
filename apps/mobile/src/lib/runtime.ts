import Constants, { ExecutionEnvironment } from 'expo-constants';

/** True inside the Expo Go store client, which lacks custom native modules (Rive, Nitro). */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
