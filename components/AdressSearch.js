import { useState, useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { updateUser } from "../reducers/user";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { utilFetch } from "../utils/function";
import FontAwesome from "react-native-vector-icons/FontAwesome";

export default function AddressSearch() {
  const user = useSelector((state) => state.user.value);
  const dispatch = useDispatch();
  const [newAdress, setNewAdress] = useState("");
  const [streetPropositions, setStreetPropositions] = useState([]);

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

  const displayedStreetPropositions = streetPropositions.map((adresse, i) => {
    const combinedAdress = `${adresse.housenumber ? adresse.housenumber : ""} ${
      adresse.street
    } - ${adresse.city} - ${adresse.postcode}`;
    const formattedAdress =
      combinedAdress.length > 45 ? combinedAdress.slice(0, 45) : combinedAdress;

    return (
      <TouchableOpacity
        key={i}
        style={styles.propositionItem}
        onPress={() =>
          addAddress(combinedAdress, { coordinates: adresse.coordinates })
        }
      >
        <FontAwesome name="map-marker" size={16} color="#ec6e5b" />
        <Text style={styles.propositionText}>{formattedAdress}</Text>
      </TouchableOpacity>
    );
  });

  return (
    <>
      <View style={styles.addressSection}>
        <Text style={styles.sectionTitle}>Adresses enregistrées</Text>
        <View style={styles.addressInputContainer}>
          <FontAwesome
            name="search"
            size={16}
            color="rgba(255, 255, 255, 0.7)"
          />
          <TextInput
            placeholder="Nouvelle adresse"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            style={styles.addressInput}
            value={newAdress}
            onChangeText={(value) => setNewAdress(value)}
          />
        </View>
        {streetPropositions.length > 0 && (
          <ScrollView style={styles.propositionsContainer}>
            {displayedStreetPropositions}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  text_white: {
    color: "white",
  },
  propositionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  addressSection: {
    flexDirection: "column",
    gap: 12,
    width: "100%",
    marginTop: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  addressInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    gap: 10,
  },
  addressInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  propositionsContainer: {
    maxHeight: 150,
    width: "100%",
    backgroundColor: "#fff",
    position: "absolute",
    top: 75,
    borderRadius: 10,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  addressListContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    padding: 5,
    minHeight: 100,
    maxHeight: 200,
  },
});
