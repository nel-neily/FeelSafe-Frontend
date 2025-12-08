import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { addSignin, addSignup, addGoogle, addNoaccount } from '../reducers/login';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from "react-native-vector-icons/FontAwesome";


export default function LoginScreen() {

    const navigation = useNavigation();
    const dispatch = useDispatch();

    // Modales
    const [isSigninModal, setSigninModal] = useState(false);
    const [isSignupModal, setSignupModal] = useState(false);
    const [isGoogleModal, setGoogleModal] = useState(false);

    // Champs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Signin action
  const handleSignin = () => {
    dispatch(addSignin({ email, password }));
    setSigninModal(false);
    navigation.navigate("TabNavigator");
  };
  
  // Signup action
  const handleSignup = () => {
    dispatch(addSignup({ email, password, confirmPassword }));
    setSignupModal(false);
  };

  // Google action
  const handleGoogle = () => {
    dispatch(addGoogle(true));
    setGoogleModal(false);
  };

  // No account
  const handleNoAccount = () => {
    dispatch(addNoaccount(true));
    navigation.navigate("TabNavigator");
  };

return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Image style={styles.image} source={require('../assets/logo-rond.png')} />

      {/* ----- BUTTONS ----- */}
      <TouchableOpacity style={styles.button} onPress={() => setSigninModal(true)}>
        <Text style={styles.textButton}>Se connecter</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => setSignupModal(true)}>
        <Text style={styles.textButton}>Créer un compte</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => setGoogleModal(true)}>
        <Text style={styles.textButton}>Se connecter avec Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleNoAccount}>
        <Text style={styles.link}>Continuer sans compte</Text>
      </TouchableOpacity>

     
      {/* ------------------  SIGNIN MODAL ------------------ */}
      <Modal visible={isSigninModal} transparent animationType="slide">
        <View style={styles.modalWrapper}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Connexion</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showHide}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalButton} onPress={handleSignin}>
              <Text style={styles.textButton}>Valider</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSigninModal(false)}>
              <Text style={styles.close}>Fermer</Text>
            </TouchableOpacity>

            {/* HIDE/SHOW PASSWORD ICON */}

            <TouchableOpacity
              style={{ position: 'absolute', right: 10, top: 12 }}
              onPress={() => setShowPassword(!showPassword)}
             >
            <FontAwesome
              name={showPassword ? "eye-slash" : "eye"}
              size={20}
              color="#4B3A43"
            />
           </TouchableOpacity>
          </View>
        </View>
      </Modal>

     
      {/* ------------------  SIGNUP MODAL ------------------ */}
      <Modal visible={isSignupModal} transparent animationType="slide">
        <View style={styles.modalWrapper}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Inscription</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showHide}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Confirmer le mot de passe"
              secureTextEntry={!showConfirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Text style={styles.showHide}>{showConfirmPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalButton} onPress={handleSignup}>
              <Text style={styles.textButton}>Créer un compte</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSignupModal(false)}>
              <Text style={styles.close}>Fermer</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSigninModal(false)}>
              <Text style={styles.close}>Fermer</Text>
            </TouchableOpacity>


            {/* HIDE/SHOW PASSWORD ICON */}

            <TouchableOpacity
              style={{ position: 'absolute', right: 10, top: 12 }}
              onPress={() => setShowPassword(!showPassword)}
             >
            <FontAwesome
              name={showPassword ? "eye-slash" : "eye"}
              size={20}
              color="#4B3A43"
            />
           </TouchableOpacity>

          </View>
        </View>
      </Modal>


      {/* ------------------ GOOGLE MODAL ------------------- */}
      <Modal visible={isGoogleModal} transparent animationType="fade">
        <View style={styles.modalWrapper}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Continuer avec Google</Text>

            <TouchableOpacity style={styles.modalButton} onPress={handleGoogle}>
              <Text style={styles.textButton}>Se connecter avec Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setGoogleModal(false)}>
              <Text style={styles.close}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
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
    height: '40%',
    marginBottom: 50,
  },
  button: {
    width: '70%',
    padding: 12,
    marginVertical: 10,
    backgroundColor: '#ffffff33',
    borderRadius: 10,
    alignItems: 'center',
  },
  textButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 20,
    color: '#ffffff',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
  modalWrapper: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    width: '90%',
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginTop: 15,
  },
  modalButton: {
    backgroundColor: '#4B3A43',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
  },
  close: {
    marginTop: 15,
    color: '#4B3A43',
    fontWeight: '600',
  },
  showHide: {
    color: '#4B3A43',
    marginTop: 5,
    fontWeight: '600',
  },
});