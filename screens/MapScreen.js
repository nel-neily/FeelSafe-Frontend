import { useEffect, useState, useRef, use } from "react";
import {
  StyleSheet,
  Dimensions,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { importMarkers } from "../reducers/markers";

export default function MapScreen() {
  const [position, setPosition] = useState(null);
  const [marker, setMarker] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  
  // --- États pour les destinations ---
  const [isDestinationModal, setIsDestinationModal] = useState(false);
  const [destinationInput, setDestinationInput] = useState("");
  const [addressPropositions, setAddressPropositions] = useState([]);
  const [destinationMarker, setDestinationMarker] = useState(null); // Coordonnées de la destination
  
  const mapRef = useRef(null);

 
  // const [markersFromDB, setMarkersFromDB] = useState([]);

  const markersInStore = useSelector((state) => state.marker.markers);
  const user = useSelector((state) => state.user.value);

   // --- Pour le debounce de Destination ---
  const debounceTimer = useRef(null);
  const dispatch = useDispatch();
  
  // --- Récupération des adresses favorites (vide si pas de compte) ---
  const favoriteAddresses = user.addresses || [];


  const fetchMarkers = async () => {
    fetch("http://192.168.100.192:3000/markers")
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          dispatch(importMarkers(data.markers)); // on stocke dans le store
          // setMarkersFromDB(data.markers); // on stocke dans l'état
        }
      })
      .catch((err) => {
        console.log("Erreur fetch markers", err);
      });
  };

 const displayMarkersFromDB = markersInStore.map((m) => (
  <Marker
    key={m._id} //  On utilise l'id unique MongoDB
    coordinate={{ latitude: m.latitude, longitude: m.longitude }}
    pinColor={m.color}
    title={m.riskType}
    onPress={() => handleMarkerPress(m)} 
  />
));


  useEffect(() => {
    fetchMarkers(); // récupération au montage
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setPosition(loc.coords);

        mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        // Suivi des mouvements
        Location.watchPositionAsync({ distanceInterval: 10 }, (location) => {
          setPosition(location.coords);

          mapRef.current?.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        });
      }
    })();
  }, []);


  // --- Fonction pour récupérer les adresses depuis l'API - Reprise de ProfileScreen.js ---
  const fetchAddresses = async (address) => {
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
      const allFeatures = data.features || [];
      const streetsNames = allFeatures.map((feature) => {
        const { housenumber, street, city, postcode } = feature.properties;
        const [longitude, latitude] = feature.geometry.coordinates; // L'API retourne [longitude, latitude]
        return {
          housenumber,
          street,
          city,
          postcode,
          latitude,
          longitude,
        };
      });
      setAddressPropositions(streetsNames);
    } catch (error) {
      console.error("Erreur lors de la récupération des adresses:", error);
      setAddressPropositions([]);
    }
  };

  // --- useEffect avec debounce pour l'API - Repris de ProfileScreen.js ---
  useEffect(() => {
    // Nettoyer le timer précédent s'il existe
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Si l'adresse est vide, réinitialiser les propositions
    if (!destinationInput || destinationInput.trim() === "") {
      setAddressPropositions([]);
      return;
    }

    // Créer un nouveau timer (réduit à 500ms)
    debounceTimer.current = setTimeout(() => {
      fetchAddresses(destinationInput);
    }, 500);

    // Cleanup: annuler le timer si le composant se démonte ou si destinationInput change
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // Le useEffect se déclenche à chaque nouvelle frappe du user
  }, [destinationInput]);

  // --- Fonction pour centrer la carte sur une destination ---
  const goToDestination = (latitude, longitude) => {
    if (!latitude || !longitude) {
      Alert.alert("Erreur", "Coordonnées de la destination introuvables", [{ text: "OK" }]);
      return;
    }
    
    // Enregistrer le marqueur de destination
    setDestinationMarker({ latitude, longitude });
    
    // Centrer la carte sur la destination
    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000); // Animation de 1 seconde
    
    // Fermer la modale
    setDestinationInput("");
    setAddressPropositions([]);
    setIsDestinationModal(false);
  };

  // --- Fonction pour géolocaliser une adresse favorite de destination et se positionner directement dessus ---
  const goToFavoriteAddress = async (address) => {
    try {
      const response = await fetch(
        `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].geometry.coordinates;
        goToDestination(latitude, longitude, address);
      } else {
        Alert.alert("Erreur", "Impossible de localiser cette adresse", [{ text: "OK" }]);
      }
    } catch (error) {
      console.error("Erreur géolocalisation adresse favorite:", error);
      Alert.alert("Erreur", "Une erreur est survenue", [{ text: "OK" }]);
    }
  };

  // Fonction marker long press
  const handleLongPress = (event) => {
    const newCoords = event.nativeEvent.coordinate;
    setMarker(newCoords);
    setIsModalVisible(true);
  };

  // Fonction sélectionner type de signalement
  const handleSelectRisk = (risk) => {
    setSelectedRisk(risk); // on enregistre le choix
    setIsModalVisible(false); //  on ferme la modal

    if (!marker) return;

    const newMarker = {
      latitude: marker.latitude,
      longitude: marker.longitude,
      riskType: risk,
      color: "orange", //  temporaire
      userId: "64a7f4e2b4c2f5d1e4a5b6c7", //  temporaire
    };
    fetch("http://192.168.100.192:3000/markers/addmarkers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMarker),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          //  rafraîchit la liste des markers dans Redux
          fetchMarkers();
        }
      })
      .catch((err) => console.log("Erreur ajout marker", err));

    // supprime le marker temporaire
    setMarker(null);
  };

const handleMarkerPress = (marker) => {
  if (marker.user !== "64a7f4e2b4c2f5d1e4a5b6c7") { // temporaire
    return Alert.alert("Alerte", "Vous ne pouvez pas supprimer ce signalement", [{ text: "OK" }]);
  }

  fetch(`http://192.168.100.192:3000/markers/${marker._id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "64a7f4e2b4c2f5d1e4a5b6c7" }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.result) {
        fetchMarkers(); // Refresh la map
      }
    });
};


  if (!position) {
    return (
      <MapView
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: 48.8566,
          longitude: 2.3522,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <MapView
          ref={mapRef} //  pour contrôler la map
          style={styles.map}
          showsUserLocation={true} //  affiche le point bleu
          followsUserLocation={true} // recadrage automatique si l'utilisateur bouge
          showsMyLocationButton={true} // bouton recadrage (Android)
          initialRegion={{
            latitude: position.latitude,
            longitude: position.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onLongPress={handleLongPress}
        >
          {displayMarkersFromDB}
          
          {/* --- Marqueur de destination --- */}
          {destinationMarker && (
            <Marker
              coordinate={{
                latitude: destinationMarker.latitude,
                longitude: destinationMarker.longitude,
              }}
              pinColor="blue"
              title="Destination"
            />
          )}
        </MapView>

        {/*  Modal de signalement */}
        <Modal
          transparent={true} //  fond transparent derrière la modal
          animationType="slide" //  animation de slide
          visible={isModalVisible} //  visible si true
          onRequestClose={() => setIsModalVisible(false)} //  Android bouton retour
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Type de signalement</Text>
              
              <ScrollView
        style={{ width: "100%", maxHeight: 300 }} // limite la hauteur
        contentContainerStyle={{ alignItems: "center" }}
      >
        {[
          "Agression",
          "Vol",
          "Comportement suspect",
          "Harcelement",
          "Bruit suspect",
          "Zone mal éclairée",
          "Accident",
          "Incendie",
          "Animal dangereux",
          "Dégradation",
          "Route endommagée",
        ].map((risk, index) => (
          <TouchableOpacity
            key={index}
            style={styles.modalButton}
            onPress={() => handleSelectRisk(risk)}
          >
            <Text style={styles.modalButtonText}>{risk}</Text>
          </TouchableOpacity>
        ))}

        {/* Tes deux autres options */}
        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => handleSelectRisk("Zone non safe")}
        >
          <Text style={styles.modalButtonText}>Zone non Safe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => handleSelectRisk("Autre suggestion")}
        >
          <Text style={styles.modalButtonText}>Autre Suggestion</Text>
        </TouchableOpacity>

      </ScrollView>

              

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#fff" }]}
                onPress={() => setIsModalVisible(false)} //  fermer la modal
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


        {/* --- Modale Destination --- */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={isDestinationModal}
          onRequestClose={() => setIsDestinationModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choisir une destination</Text>
              
              {/* Input de recherche d'adresse */}
              <View style={styles.inputContainer}>
                <FontAwesome name="search" size={20} color="#666" />
                <TextInput
                  placeholder="Saisissez une adresse..."
                  placeholderTextColor="#999"
                  style={styles.textInput}
                  value={destinationInput}
                  onChangeText={(value) => setDestinationInput(value)}
                />
              </View>

              {/* --- Propositions de l'API - Reprise de ProfileScreen.js --- */}
              {addressPropositions.length > 0 && (
                <ScrollView style={styles.propositionsContainer}>
                  {addressPropositions.map((adresse, i) => {
                    const combinedAdress = `${adresse.housenumber ? adresse.housenumber : ""} ${
                      adresse.street
                    } - ${adresse.city} - ${adresse.postcode}`;
                    const formattedAdress =
                      combinedAdress.length > 45 ? combinedAdress.slice(0, 45) : combinedAdress;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={styles.propositionItem}
                        onPress={() => goToDestination(adresse.latitude, adresse.longitude, formattedAdress)}
                      >
                        <FontAwesome name="map-marker" size={16} color="#ec6e5b" />
                        <Text style={styles.propositionText}>{formattedAdress}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* --- Section Adresses favorites --- */}
              <View style={{ width: "100%", marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Vos adresses favorites</Text>
                
                {favoriteAddresses.length > 0 ? (
                  <ScrollView style={{ maxHeight: 150 }}>
                    {favoriteAddresses.map((address, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.favoriteItem}
                        onPress={() => goToFavoriteAddress(address)}
                      >
                        <FontAwesome name="location-arrow" size={18} color="#ec6e5b" />
                        <Text style={styles.favoriteText}>{address}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.favoritesPlaceholder}>
                    <Text style={styles.placeholderText}>
                      {user.token 
                        ? "Aucune adresse favorite enregistrée" 
                        : "Connectez-vous pour accéder à vos adresses favorites"}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#6C5364", marginTop: 20 }]}
                onPress={() => setIsDestinationModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- Bouton Destination "+" --- */}
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setIsDestinationModal(true)}
        >
          <FontAwesome name="plus" size={30} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}





const styles = StyleSheet.create({
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalButton: {
    backgroundColor: "#ec6e5b",
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#black",
    fontSize: 16,
    fontWeight: "600",
  },
  // --- Styles pour le bouton Destination "+" ---
  floatingButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ec6e5b",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // --- Styles pour la modale Destination ---
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    alignSelf: "flex-start",
    marginTop: 15,
    marginBottom: 10,
  },
  inputContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f9f9f9",
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#333",
  },
  // --- Styles pour les propositions de l'API ---
  propositionsContainer: {
    width: "100%",
    minHeight: 100,
    maxHeight: 200,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ec6e5b",
  },
  propositionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  propositionText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  inputPlaceholder: {
    marginLeft: 10,
    color: "#999",
    fontSize: 15,
  },
  favoritesPlaceholder: {
    width: "100%",
    padding: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    alignItems: "center",
  },
  // --- Styles pour les adresses favorites ---
  favoriteItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  favoriteText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  placeholderText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
});
