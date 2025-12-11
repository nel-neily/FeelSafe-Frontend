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
import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateUser, logoutUser } from "../reducers/user";
import { Alert } from "react-native";
import { utilFetch } from "../utils/function";

import AsyncStorage from "@react-native-async-storage/async-storage";

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

  //   GESTION DES ADRESSES FAVORITES
  //   un input vient requêté une API Géoloc française toutes les secondes où le user ne tape plus
  //   une collection de propositions viennent s'afficher et le user n'a qu'à cliquer sur uen adresse pour qu'elle s'enregistre
  const [newAdress, setNewAdress] = useState("");
  const [streetPropositions, setStreetPropositions] = useState([]);
  const adresses = user.addresses;

  const addAddress = async (newAddress, coords) => {
    const url = `/users/update?addresses=${newAddress}`;
    const data = await utilFetch(url, "POST", {
      email: user.email,
      coordinates: coords.coordinates,
    });

    dispatch(updateUser({ addresses: data.addresses }));
    setNewAdress("");
    setStreetPropositions([]);
  };
  const removeAdress = async (addressToDelete) => {
    const url = `/users/update?addresses=${addressToDelete}`;
    const data = await utilFetch(url, "DELETE", { email: user.email });
    dispatch(updateUser({ addresses: data.addresses }));
  };
  const displayedAdresses = adresses.map((adresse, i) => {
    return (
      <View
        style={{ flexDirection: "row", justifyContent: "flex-start" }}
        key={i}
      >
        <Text
          style={[
            styles.text_white,
            {
              height: 50,
              width: "90%",
            },
          ]}
        >
          {adresse.address}
        </Text>
        <FontAwesome
          name="trash"
          color={"#fff"}
          size={20}
          onPress={() => removeAdress(adresse.address)}
        />
      </View>
    );
  });

  const displayedStreetPropositions = streetPropositions.map((adresse, i) => {
    const combinedAdress = `${adresse.housenumber ? adresse.housenumber : ""} ${
      adresse.street
    } - ${adresse.city} - ${adresse.postcode}`;
    const formattedAdress =
      combinedAdress.length > 45 ? combinedAdress.slice(0, 45) : combinedAdress;

    return (
      <TouchableOpacity
        key={i}
        style={{
          height: 35,
          justifyContent: "center",
          paddingLeft: 10,
          borderWidth: 0.5,
          borderColor: "gray",
          formattedAdress,
        }}
        onPress={() =>
          addAddress(combinedAdress, { coordinates: adresse.coordinates })
        }
      >
        <Text>{formattedAdress}</Text>
      </TouchableOpacity>
    );
  });

  //   Le fetch à l'API se fait dans une requête async appelée par le useEffect plus bas

  const fetchAdresses = async (address) => {
    if (!address || address.trim() === "") {
      return;
    }
    try {
      const response = await fetch(
        `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(
          address
        )}`
      );
      const data = await response.json();
      const allFeatures = data.features;
      const streetsNames = allFeatures.map((feature) => {
        const { housenumber, street, city, postcode } = feature.properties;
        const { coordinates } = feature.geometry;
        return {
          housenumber,
          street,
          city,
          postcode,
          coordinates,
        };
      });

      setStreetPropositions(streetsNames);
    } catch (error) {
      console.error("Erreur lors de la récupération des adresses:", error);
    }
  };
  //   La fonction debounce permettra de ne pas actualiser la recherche à chaque frappe mais après une seconde d'arrêt de frappe

  const debounceTimer = useRef(null);

  useEffect(() => {
    // Nettoyer le timer précédent s'il existe
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Si l'adresse est vide, ne rien faire
    if (!newAdress || newAdress.trim() === "") {
      return;
    }

    // Créer un nouveau timer
    debounceTimer.current = setTimeout(() => {
      fetchAdresses(newAdress);
    }, 1000);

    // Cleanup: annuler le timer si le composant se démonte ou si newAdress change
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // Le useEffect se déclenche à chaque nouvelle frappe du user
  }, [newAdress]);

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
              <View style={{ flexDirection: "column", gap: 20, width: "100%" }}>
                <Text style={[styles.text_white, { fontSize: 18 }]}>
                  Adresses enregistrées
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    width: "100%",
                    borderWidth: 1,
                    borderColor: "white",
                    borderRadius: 10,
                    paddingLeft: 5,
                    height: 45,
                  }}
                >
                  <TextInput
                    placeholder="Nouvelle addresse"
                    placeholderTextColor="#fff"
                    style={{
                      width: "80%",
                      height: "100%",
                      color: "#fff",
                    }}
                    value={newAdress}
                    onChangeText={(value) => setNewAdress(value)}
                  ></TextInput>
                </View>

                {streetPropositions.length > 0 && (
                  <ScrollView
                    style={{
                      height: 150,
                      width: "100%",
                      backgroundColor: "#fff",
                      position: "absolute",
                      top: 110,
                      borderRadius: 10,
                      zIndex: 10,
                    }}
                  >
                    {displayedStreetPropositions}
                  </ScrollView>
                )}
              </View>
              <ScrollView>{displayedAdresses}</ScrollView>
              <TouchableOpacity
                style={styles.button_main_features}
                onPress={() => logout()}
              >
                <Text style={styles.text_white}>Se déconnecter</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity
                style={[
                  styles.button_main_features,
                  { flexDirection: "row", justifyContent: "space-around" },
                ]}
                onPress={() => setDarkMode(!darkMode)}
              >
                <Text style={styles.text_white}>Mode sombre</Text>
                {darkMode && (
                  <FontAwesome name="toggle-off" color={"#fff"} size={30} />
                )}
                {darkMode || (
                  <FontAwesome name="toggle-on" color={"#fff"} size={30} />
                )}
              </TouchableOpacity> */}
              <TouchableOpacity
                style={[
                  styles.button_main_features,
                  {
                    backgroundColor: "red",
                  },
                ]}
                onPress={() => setEraseAccountModal(!eraseAccountModal)}
              >
                <Text style={[styles.text_white, { fontSize: 20 }]}>
                  Supprimer votre compte
                </Text>
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
                        color: "#fff",
                        fontSize: 24,
                        textAlign: "center",
                      }}
                    >
                      Cette étape est définitive, voulez vous supprimer votre
                      compte?
                    </Text>
                    <TouchableOpacity
                      style={styles.modalText}
                      onPress={() => deleteAccount()}
                    >
                      <Text style={{ color: "red" }}>
                        Suppression du compte
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonClose]}
                      onPress={() => setEraseAccountModal(!eraseAccountModal)}
                    >
                      <Text style={[styles.textStyle, { color: "black" }]}>
                        Annuler la suppression
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
    justifyContent: "space-around",
    alignItems: "center",
    padding: 20,
    gap: 20,
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
    width: "80%",
    height: 50,
    borderBottomColor: "#fff",
    borderBottomWidth: 2,
    padding: 2,
    justifyContent: "space-around",
  },
  text_white: {
    color: "white",
  },
  button_main_features: {
    height: 50,
    width: "80%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "75%",
    height: "50%",
    margin: 20,
    backgroundColor: "red",
    borderRadius: 20,
    padding: 35,
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
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#fff",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    backgroundColor: "#fff",
    height: 50,
    width: "75%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
