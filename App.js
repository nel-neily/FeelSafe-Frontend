import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './screens/LoginScreen';

import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import login from './reducers/login';

const store = configureStore({
  reducer: { login },
});


// export default function App() {
//   return (
//     <Provider store={store}>
//       <NavigationContainer>
//         <Stack.Navigator screenOptions={{ headerShown: false }}>
//           <Stack.Screen name="Login" component={LoginScreen} />
//           <Stack.Screen name="TabNavigator" component={TabNavigator} />
//         </Stack.Navigator>
//       </NavigationContainer>
//     </Provider>
//   );
// }


export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
      <Stack.Screen name="Login" component={LoginScreen} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
