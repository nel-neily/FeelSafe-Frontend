import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { addSignin } from '../reducers/login';
import { addSignup } from '../reducers/login';
import { addGoogle } from '../reducers/login';
import { addNoaccount } from '../reducers/login';

export default function LoginScreen() {

    const dispatch = useDispatch();
    const [signin, setSignin] = useState('');
    const [signup, setSignup] = useState('');
    const [google, setGoogle] = useState('');
    const [noaccount, setNoaccount] = useState('');
    
    const handleSubmit = () => {
        dispatch(addSignin(signin));
        dispatch(addSignup(signup));
        dispatch(addGoogle(google));
        dispatch(addNoaccount(noaccount));
    }


return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Image style={styles.image} source={require('../assets/logo-rond.png')} />

      {/* Bouton Sign In */}
      <TextInput placeholder="Signin" onChangeText={(value) => setSignin(value)} value={signin} style={styles.input} />
      <TouchableOpacity onPress={() => handleSubmit()} style={styles.button} activeOpacity={0.8}>
        <Text style={styles.textButton}>Sign in</Text>
      </TouchableOpacity>

      {/* Bouton Sign Up */}
       <TextInput placeholder="Signup" onChangeText={(value) => setSignup(value)} value={signup} style={styles.input} />
      <TouchableOpacity onPress={() => handleSubmit()} style={styles.button} activeOpacity={0.8}>
        <Text style={styles.textButton}>Sign up</Text>
      </TouchableOpacity>

     {/* Bouton Google Sign In */}
      <TextInput placeholder="GoogleSignin" onChangeText={(value) => setGoogle(value)} value={google} style={styles.input} />
      <TouchableOpacity onPress={() => handleSubmit()} style={styles.button} activeOpacity={0.8}>
        <Text style={styles.textButton}>Sign in with Google</Text>
      </TouchableOpacity>

      {/* Lien NoAccount */}
      <TextInput placeholder="NoAccount" onChangeText={(value) => setNoaccount(value)} value={noaccount} style={styles.input} />
      <TouchableOpacity onPress={() => handleSubmit()} style={styles.button} activeOpacity={0.8}>
        <Text style={styles.link}>Sign in without account</Text>
      </TouchableOpacity>

    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4B3A43',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '50%',
  },
  input: {
    width: '80%',
    marginTop: 25,
    borderBottomColor: '#ffffff',
    borderBottomWidth: 1,
    fontSize: 18,
  },
  button: {
    alignItems: 'center',
    paddingTop: 8,
    width: '80%',
    marginTop: 30,
    borderRadius: 10,
    marginBottom: 80,
  },
  textButton: {
    color: '#ffffff',
    height: 30,
    fontWeight: '600',
    fontSize: 16,
  },
    link: {
    color: '#ffffff',
    height: 30,
    fontWeight: '600',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
