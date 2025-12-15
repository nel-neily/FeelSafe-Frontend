import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateUser, logoutUser } from "../reducers/user";
import { Alert } from "react-native";
import { utilFetch } from "../utils/function";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AddressSearch from "../components/AdressSearch";

export default function ProfileScreen({ navigation }) {
  // GLOBALS VARIABLES

  const user = useSelector((state) => state.user.value);
  const username = user.username;
  const dispatch = useDispatch();
  // GESTION DU USERNAME

  const [newUsername, setNewUsername] = useState("");
  const [isChangingUserName, setIsChangingUsername] = useState(false);
  const saveUsername = async () => {
    const url = `/users/update?username=${newUsername}`;

    const data = await utilFetch(url, "POST", { email: user.email });
    dispatch(updateUser({ username: data.username }));
    setIsChangingUsername(false);
  };

  //   GESTION DU DARKMODE
  const [darkMode, setDarkMode] = useState(false);

  const adresses = user.addresses;

  const removeAdress = async (addressToDelete) => {
    const url = `/users/update?addresses=${addressToDelete}`;
    const data = await utilFetch(url, "DELETE", { email: user.email });
    dispatch(updateUser({ addresses: data.addresses }));
  };
  const displayedAdresses = adresses.map((adresse, i) => {
    return (
      <View style={styles.addressItem} key={i}>
        <Text style={styles.addressText}>{adresse.address}</Text>
        <TouchableOpacity onPress={() => removeAdress(adresse.address)}>
          <FontAwesome
            name="trash"
            color={"rgba(255, 255, 255, 0.7)"}
            size={18}
          />
        </TouchableOpacity>
      </View>
    );
  });

  //   GESTION DE LA DECONNECTION
  const removeValue = async () => {
    try {
      await AsyncStorage.removeItem("token");
    } catch (e) {
      console.error(e);
      // remove error
    }
  };
  const logout = async () => {
    dispatch(logoutUser());
    await removeValue().then(() => navigation.navigate("Login"));
  };

  //   GESTION DE LA SUPPRESSION DE COMPTE
  const Alerte = (message) => {
    Alert.alert("Alerte", message, [{ text: "OK" }]);
  };

  const [eraseAccountModal, setEraseAccountModal] = useState(false);
  const deleteAccount = async () => {
    const url = `/users/${user.token}`;
    const data = await utilFetch(url, "DELETE");
    if (!data.result) {
      Alerte(
        "Votre compte n'a pas été trouvé et donc n'a pas pu être supprimé"
      );
    }
    setEraseAccountModal(!eraseAccountModal);
    await logout();
  };

  return (
    <>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <LinearGradient
            colors={["#26232F", "#282430", "#6C5364"]}
            style={styles.background}
          />
          <Image
            source={require("../assets/logo-rond.png")}
            style={{
              height: 150,
              width: 150,
            }}
          ></Image>
          {user.token && (
            <>
              <View style={styles.username_view}>
                {isChangingUserName && (
                  <>
                    <TextInput
                      style={[styles.text_white, { width: "70%" }]}
                      placeholder="Enter your username"
                      placeholderTextColor="#fff"
                      value={newUsername}
                      onChangeText={(value) => setNewUsername(value)}
                    ></TextInput>
                    <TouchableOpacity
                      style={{ justifyContent: "center", alignItems: "center" }}
                      onPress={() => saveUsername()}
                    >
                      <Text style={styles.text_white}>OK</Text>
                    </TouchableOpacity>
                  </>
                )}
                {isChangingUserName || (
                  <>
                    <Text
                      style={[
                        styles.text_white,
                        username
                          ? { textAlign: "center", fontSize: 24 }
                          : { textAlign: "left" },
                        { width: "70%" },
                      ]}
                    >
                      {username ? username : "Inscrivez votre username"}
                    </Text>
                    <FontAwesome
                      name="pencil"
                      color={"#fff"}
                      size={20}
                      onPress={() => setIsChangingUsername(true)}
                    />
                  </>
                )}
              </View>
              <AddressSearch page={"Profile"} />

              <View style={styles.addressListContainer}>
                {displayedAdresses.length > 0 ? (
                  displayedAdresses
                ) : (
                  <Text style={styles.emptyText}>
                    Aucune adresse enregistrée
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.button_main_features, { marginTop: "auto" }]}
                onPress={() => logout()}
              >
                <Text style={styles.text_white}>Se déconnecter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button_delete_account}
                onPress={() => setEraseAccountModal(!eraseAccountModal)}
              >
                <Text style={styles.text_delete}>Supprimer votre compte</Text>
              </TouchableOpacity>
              <Modal
                animationType="slide"
                transparent={true}
                visible={eraseAccountModal}
                onRequestClose={() => {
                  setEraseAccountModal(!eraseAccountModal);
                }}
              >
                <View style={styles.centeredView}>
                  <View style={styles.modalView}>
                    <Text
                      style={{
                        color: "#333",
                        fontSize: 18,
                        textAlign: "center",
                        marginBottom: 20,
                      }}
                    >
                      Cette étape est définitive, voulez-vous supprimer votre
                      compte ?
                    </Text>
                    <TouchableOpacity
                      style={styles.buttonDeleteConfirm}
                      onPress={() => deleteAccount()}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        Confirmer la suppression
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.buttonCancelDelete}
                      onPress={() => setEraseAccountModal(!eraseAccountModal)}
                    >
                      <Text style={{ color: "#333", fontWeight: "600" }}>
                        Annuler
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          )}
          {!user.token && (
            <>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={[
                    styles.text_white,
                    { fontSize: 18, textAlign: "center" },
                  ]}
                >
                  Vous devez avoir un compte actif pour pouvoir personnaliser
                  votre expérience.
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: "#6C5364",
                  width: "50%",
                  height: 60,
                  borderRadius: 10,
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
                onPress={() => navigation.navigate("Login")}
              >
                <Text
                  style={[
                    styles.text_white,
                    { fontSize: 18, textAlign: "center" },
                  ]}
                >
                  Retour au menu d'inscription
                </Text>
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    boxSizing: "border-box",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 15,
    gap: 10,
  },
  background: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  username_view: {
    flexDirection: "row",
    width: "90%",
    minHeight: 50,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.4)",
    paddingBottom: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
  },
  text_white: {
    color: "white",
  },
  button_main_features: {
    height: 50,
    width: "80%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#ddd",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "85%",
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 25,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // Bouton "Supprimer votre compte"
  button_delete_account: {
    height: 45,
    width: "80%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  text_delete: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "400",
  },
  // Boutons de la modale de suppression
  buttonDeleteConfirm: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E57373",
    alignItems: "center",
    marginBottom: 10,
  },
  buttonCancelDelete: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#ddd",
  },
  // Section adresses

  addressListContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    padding: 5,
    minHeight: 100,
    maxHeight: 200,
  },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
    gap: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    textAlign: "center",
    padding: 20,
  },
});
