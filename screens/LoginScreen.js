import { useEffect, useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch } from "react-redux";
import { addUser } from "../reducers/user";
import { useNavigation } from "@react-navigation/native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { utilFetch } from "../utils/function";

export default function LoginScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const storeData = async (value) => {
    try {
      await AsyncStorage.setItem("token", value);
    } catch (e) {
      // saving error
      console.error(e);
    }
  };

  const getData = async () => {
    try {
      const value = await AsyncStorage.getItem("token");
      if (value !== null) {
        // value previously stored
        return value;
      } else {
        return null;
      }
    } catch (e) {
      // error reading value
      console.error(e);
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getData();
      if (!token) return;
      const url = `/users/auto-signin/${token}`;
      const data = await utilFetch(url, "POST");
      if (!data.result) return;

      dispatch(addUser(data.user));
      storeData(data.user.token);
      navigation.navigate("TabNavigator");
    })();
  }, []);
  // Modals
  const [isSigninModal, setSigninModal] = useState(false);
  const [isSignupModal, setSignupModal] = useState(false);

  // Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Remplace 'Alert' with 'Alerte' in French
  const Alerte = (message) => {
    Alert.alert("Alerte", message, [{ text: "OK" }]);
  };
  // SIGNIN ACTION
  const handleSignin = async () => {
    try {
      // Regex to validate the email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email) {
        Alerte("Veuillez saisir votre mail.");
        return;
      }

      if (!emailRegex.test(email)) {
        Alerte("Veuillez saisir une adresse mail valide.");
        return;
      }
      const url = `/users/signin`;
      // Call backend

      const data = await utilFetch(url, "POST", { email, password });

      if (data.user.token) {
        dispatch(addUser(data.user));

        await storeData(data.user.token);

        // Empty fields after signin
        setEmail("");
        setPassword("");

        setSigninModal(false);
        navigation.navigate("TabNavigator", { screen: "MapScreen" });
      } else {
        setEmail("");
        setPassword("");
        Alerte("Email ou mot de passe incorrect");
      }
    } catch (error) {
      console.error(error);
      Alerte("Erreur lors de la connexion");
      setEmail("");
      setPassword("");
    }
  };

  // SIGNUP ACTION
  const handleSignup = async () => {
    try {
      // Regex to validate the email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email) {
        Alerte("Veuillez saisir votre mail.");
        return;
      }

      if (!emailRegex.test(email)) {
        Alerte("Veuillez saisir une adresse mail valide.");
        return;
      }

      if (!password) {
        Alerte("Veuillez saisir un mot de passe.");
        return;
      }

      if (password !== confirmPassword) {
        Alerte("Les mots de passe ne correspondent pas.");
        return;
      }

      // Call backend
      const url = `/users/signup`;
      const data = await utilFetch(url, "POST", { email, password });
      if (data.user.token) {
        dispatch(addUser(data.user));

        await storeData(data.user.token);

        // Empty fields after signup
        setEmail("");
        setPassword("");
        setConfirmPassword("");

        setSignupModal(false);
        navigation.navigate("TabNavigator", { screen: "Map" });
      } else {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        Alerte("Email ou mot de passe incorrect");
      }
    } catch (error) {
      console.error(error);
      Alerte("Erreur lors de la connexion");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }
  };

  // CONTINUE WITHOUT ACCOUNT ACTION
  const handleNoAccount = () => {
    navigation.navigate("TabNavigator", { screen: "Map" });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#26232F", "#282430", "#6C5364"]}
        style={styles.background}
      />
      <Image style={styles.image} source={require("../assets/logo-rond.png")} />

      {/* ----- BUTTONS ----- */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setSigninModal(true)}
      >
        <Text style={styles.textButton}>Se connecter</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setSignupModal(true)}
      >
        <Text style={styles.textButton}>Créer un compte</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleNoAccount}>
        <Text style={styles.link}>Continuer sans compte</Text>
      </TouchableOpacity>

      {/* ---  SIGNIN MODAL --- */}
      <Modal visible={isSigninModal} transparent animationType="slide">
        <View style={styles.modalWrapper}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Connexion</Text>

            {/* EMAIL */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              onChangeText={(value) => setEmail(value)}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* PASSWORD */}
            <View style={{ width: "90%", marginTop: 15, position: "relative" }}>
              <TextInput
                style={{ ...styles.input, paddingRight: 40 }} // espace pour l'icône
                placeholder="Mot de passe"
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                autoCapitalize="none"
                value={password}
              />
              {/* HIDE/SHOW PASSWORD ICON */}
              <TouchableOpacity
                style={{ position: "absolute", right: 10, top: 12 }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome
                  name={showPassword ? "eye-slash" : "eye"}
                  size={20}
                  color="#4B3A43"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                ...styles.modalButton,
                backgroundColor: email && password ? "#4B3A43" : "#888", // gris si vide
              }}
              onPress={handleSignin}
              // Hide the Signin button color until all fields are completed
              disabled={!email || !password}
            >
              <Text style={styles.textButton}>Valider</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSigninModal(false)}>
              <Text style={styles.close}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- SIGNUP MODAL --- */}
      <Modal visible={isSignupModal} transparent animationType="slide">
        <View style={styles.modalWrapper}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Inscription</Text>

            {/* EMAIL */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* PASSWORD */}
            <View style={{ width: "90%", marginTop: 15, position: "relative" }}>
              <TextInput
                style={{ ...styles.input, paddingRight: 40 }}
                placeholder="Mot de passe"
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                autoCapitalize="none"
                value={password}
              />
              <TouchableOpacity
                style={{ position: "absolute", right: 10, top: 12 }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome
                  name={showPassword ? "eye-slash" : "eye"}
                  size={20}
                  color="#4B3A43"
                />
              </TouchableOpacity>
            </View>

            {/* CONFIRM PASSWORD */}
            <View style={{ width: "90%", marginTop: 15, position: "relative" }}>
              <TextInput
                style={{ ...styles.input, paddingRight: 40 }}
                placeholder="Confirmer le mot de passe"
                secureTextEntry={!showConfirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                value={confirmPassword}
              />
              {/* HIDE/SHOW PASSWORD ICON */}
              <TouchableOpacity
                style={{ position: "absolute", right: 10, top: 12 }}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <FontAwesome
                  name={showConfirmPassword ? "eye-slash" : "eye"}
                  size={20}
                  color="#4B3A43"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                ...styles.modalButton,
                backgroundColor:
                  email && password && confirmPassword ? "#4B3A43" : "#888",
              }}
              onPress={handleSignup}
              // Hide the Signup button color until all fields are completed
              disabled={!email || !password || !confirmPassword}
            >
              <Text style={styles.textButton}>Créer un compte</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSignupModal(false)}>
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
    alignItems: "center",
    justifyContent: "center",
  },
  background: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: "100%",
    height: "40%",
    marginBottom: 50,
  },
  button: {
    width: "70%",
    padding: 12,
    marginVertical: 10,
    backgroundColor: "#ffffff33",
    borderRadius: 10,
    alignItems: "center",
  },
  textButton: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    marginTop: 20,
    color: "#ffffff",
    textDecorationLine: "underline",
    fontSize: 16,
  },
  modalWrapper: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 12,
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    width: "90%",
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginTop: 15,
  },
  modalButton: {
    backgroundColor: "#4B3A43",
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    width: "80%",
    alignItems: "center",
  },
  close: {
    marginTop: 15,
    color: "#4B3A43",
    fontWeight: "600",
  },
  showHide: {
    color: "#4B3A43",
    marginTop: 5,
    fontWeight: "600",
  },
});
