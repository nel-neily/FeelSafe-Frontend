import { useEffect, useState, useRef } from "react";
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
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { importMarkers } from "../reducers/markers";
import FontAwesome from "react-native-vector-icons/FontAwesome";

export default function MapScreen() {
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const [position, setPosition] = useState(null);
  const [marker, setMarker] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // --- État pour la modale Menu du bouton '+' ---
  const [isBtnMenuModal, setIsBtnMenuModal] = useState(false);

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

  const [selectedMarker, setSelectedMarker] = useState(null);

  // Modal personnalisé pour le risque 'Autre signalement'
  const [isCustomRiskModal, setIsCustomRiskModal] = useState(false);
  const [customRiskText, setCustomRiskText] = useState("");

  const fetchMarkers = async () => {
    fetch(`${BACKEND_URL}/markers`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          dispatch(importMarkers(data.markers)); // on stocke dans le store
        }
      })
      .catch((err) => {
        console.log("Erreur fetch markers", err);
      });
  };

  const displayMarkersFromDB = markersInStore.map((m) => {
    return (
      <Marker
        key={m._id}
        coordinate={{ latitude: m.latitude, longitude: m.longitude }}
        title={m.riskType}
        onPress={(e) => setSelectedMarker(m)}
        onDeselect={() => setSelectedMarker(null)}
      >
        <MaterialIcons name="priority-high" size={50} color={m.color} />
      </Marker>
    );
  });

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
      Alert.alert("Erreur", "Coordonnées de la destination introuvables", [
        { text: "OK" },
      ]);
      return;
    }

    // Enregistrer le marqueur de destination
    setDestinationMarker({ latitude, longitude });

    // Centrer la carte sur la destination
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    ); // Animation de 1 seconde

    // Fermer la modale
    setDestinationInput("");
    setIsDestinationModal(false);
  };

  // Fonction marker long press
  const handleLongPress = (event) => {
    const newCoords = event.nativeEvent.coordinate;
    setMarker(newCoords);
    setIsModalVisible(true);
  };

  // Fonction sélectionner type de signalement
  const handleSelectRisk = (risk) => {
    if (!user.id) return;

    const color = getRiskColor(risk);

    const markerCoords = {
      latitude: position.latitude,
      longitude: position.longitude,
    };

    const newMarker = {
      latitude: marker ? marker.latitude : markerCoords.latitude,
      longitude: marker ? marker.longitude : markerCoords.longitude,
      riskType: risk,
      color: color,
      userId: user.id,
    };
    fetch(`${BACKEND_URL}/markers/addmarkers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMarker),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          fetchMarkers();
          setMarker(null);
          setIsModalVisible(false);
        }
      })
      .catch((err) => console.log("Erreur ajout marker", err));
  };

  const handleMarkerPress = (marker) => {
    if (marker.users._id !== user.id) {
      // temporaire
      return alert("Vous ne pouvez pas supprimer ce signalement");
    }

    fetch(`${BACKEND_URL}/markers/${marker._id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          fetchMarkers(); // Refresh la map
          setSelectedMarker(null); // ferme le popup
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

  const getRiskColor = (risk) => {
    // Danger élevé
    if (["Agression", "Vol", "Harcèlement", "Incendie"].includes(risk)) {
      return "#E57373";
    }
    // Danger moyen
    if (
      [
        "Comportement suspect",
        "Bruit suspect",
        "Dégradation",
        "Accident",
      ].includes(risk)
    ) {
      return "#FFB74D";
    }
    // Danger faible
    if (
      [
        "Animal sauvage",
        "Zone mal éclairée",
        "Route endommagée",
      ].includes(risk)
    ) {
      return "#FFEB3B";
    }
    // Autre signalement
    return "#A66CFF";
    
  };

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

        {selectedMarker && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={true}
            onRequestClose={() => setSelectedMarker(null)}
          >
            <View style={styles.deleteModalContainer}>
              <View style={styles.deleteModal}>
                <Text style={styles.modalTitle}>{selectedMarker.riskType}</Text>

                {selectedMarker.users._id === user.id && (
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => handleMarkerPress(selectedMarker)}
                  >
                    <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.menuButton]}
                  onPress={() => setSelectedMarker(null)}
                >
                  <Text style={styles.menuButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

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
                style={{ width: "100%", maxHeight: 300 }}
                contentContainerStyle={{ alignItems: "center" }}
              >
                {/* 🔴 SIGNALLEMENT ÉLEVÉ */}
                <Text
                  style={{
                    color: "#E57373",
                    fontWeight: "bold",
                    marginTop: 5,
                    marginBottom: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  Signalement élevé
                </Text>

                {["Agression", "Vol", "Harcèlement", "Incendie"].map(
                  (risk, index) => (
                    <TouchableOpacity
                      key={`high-${index}`}
                      style={styles.dangerHighButton}
                      onPress={() => handleSelectRisk(risk)}
                    >
                      <Text style={styles.dangerHighText}>{risk}</Text>
                    </TouchableOpacity>
                  )
                )}

                {/* Ligne pointillée de séparation */}
                <View
                  style={{
                    width: "100%",
                    height: 1,
                    borderStyle: "dotted",
                    borderWidth: 1,
                    borderColor: "#ccc",
                    marginVertical: 12,
                  }}
                />

                {/* 🟧 SIGNALLEMENT MOYEN */}
                <Text
                  style={{
                    color: "#FFB74D",
                    fontWeight: "bold",
                    marginBottom: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  Signalement moyen
                </Text>

                {[
                  "Comportement suspect",
                  "Bruit suspect",
                  "Dégradation",
                  "Accident",
                ].map((risk, index) => (
                  <TouchableOpacity
                    key={`medium-${index}`}
                    style={styles.dangerMediumButton}
                    onPress={() => handleSelectRisk(risk)}
                  >
                    <Text style={styles.dangerMediumText}>{risk}</Text>
                  </TouchableOpacity>
                ))}

                {/* Ligne pointillée de séparation */}
                <View
                  style={{
                    width: "100%",
                    height: 1,
                    borderStyle: "dotted",
                    borderWidth: 1,
                    borderColor: "#ccc",
                    marginVertical: 12,
                  }}
                />

                {/* 🟨 SIGNALLEMENT FAIBLE */}
                <Text
                  style={{
                    color: "#FFCC80",
                    fontWeight: "bold",
                    marginBottom: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  Signalement faible
                </Text>

                {[
                  "Animal sauvage",
                  "Zone mal éclairée",
                  "Route endommagée",
                ].map((risk, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dangerLowButton}
                    onPress={() => handleSelectRisk(risk)}
                  >
                    <Text style={styles.dangerLowText}>{risk}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.otherButton}
                onPress={() => {
                  setIsModalVisible(false);
                  setIsCustomRiskModal(true);
                }}
              >
                <Text style={styles.otherButtonText}>
                  Autre signalement
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- Modale Menu du bouton '+' --- */}
        <Modal
          transparent={true}
          animationType="fade"
          visible={isBtnMenuModal}
          onRequestClose={() => setIsBtnMenuModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Bouton Signaler un danger */}
              <TouchableOpacity
                style={[styles.menuButton, { marginVertical: 10 }]}
                onPress={() => {
                  setIsBtnMenuModal(false);
                  setIsModalVisible(true);
                }}
              >
                <FontAwesome
                  name="exclamation-triangle"
                  size={20}
                  color="#ec6e5b"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.menuButtonText}>Signaler un danger</Text>
              </TouchableOpacity>

              {/* Bouton Ajouter une destination */}
              <TouchableOpacity
                style={[styles.menuButton, { marginVertical: 10 }]}
                onPress={() => {
                  setIsBtnMenuModal(false);
                  setIsDestinationModal(true);
                }}
              >
                <FontAwesome
                  name="map-marker"
                  size={20}
                  color="#ec6e5b"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.menuButtonText}>
                  Ajouter une destination
                </Text>
              </TouchableOpacity>

              {/* Bouton Annuler */}
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: "#6C5364", marginTop: 10 },
                ]}
                onPress={() => setIsBtnMenuModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                  Annuler
                </Text>
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

              {/* --- Propositions du store redux - Reprise de ProfileScreen.js --- */}
              {addressPropositions.length > 0 && (
                <ScrollView style={styles.propositionsContainer}>
                  {addressPropositions.map((adresse, i) => {
                    const combinedAdress = `${
                      adresse.housenumber ? adresse.housenumber : ""
                    } ${adresse.street} - ${adresse.city} - ${
                      adresse.postcode
                    }`;
                    const formattedAdress =
                      combinedAdress.length > 45
                        ? combinedAdress.slice(0, 45)
                        : combinedAdress;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={styles.propositionItem}
                        onPress={() =>
                          goToDestination(
                            adresse.latitude,
                            adresse.longitude,
                            formattedAdress
                          )
                        }
                      >
                        <FontAwesome
                          name="map-marker"
                          size={16}
                          color="#ec6e5b"
                        />
                        <Text style={styles.propositionText}>
                          {formattedAdress}
                        </Text>
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
                        onPress={() =>
                          goToDestination(address.coords[1], address.coords[0])
                        }
                      >
                        <FontAwesome
                          name="location-arrow"
                          size={18}
                          color="#ec6e5b"
                        />
                        <Text style={styles.favoriteText}>
                          {address.address}
                        </Text>
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
                style={[
                  styles.modalButton,
                  { backgroundColor: "#6C5364", marginTop: 20 },
                ]}
                onPress={() => setIsDestinationModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                  Fermer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- Modale pour 'Autre signalement' --- */}
        <Modal
          transparent={true}
          animationType="fade"
          visible={isCustomRiskModal}
          onRequestClose={() => setIsCustomRiskModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Autre signalement</Text>

              <TextInput
                style={{
                  width: "100%",
                  height: 120,
                  backgroundColor: "#FFF",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#E28AAE",
                  textAlignVertical: "top",
                  fontSize: 15,
                  color: "#2E2633",
                }}
                placeholder="Décrivez le signalement... (150 caractères max)"
                placeholderTextColor="#999"
                maxLength={150}
                multiline={true}
                value={customRiskText}
                onChangeText={(value) => setCustomRiskText(value)}
              />

              <TouchableOpacity
                style={[styles.modalButton, { marginTop: 20 }]}
                onPress={() => {
                  if (customRiskText.trim().length === 0) {
                    return alert("Votre message est vide.");
                  }

                  if (!marker || !user.id) return;

                  const newMarker = {
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                    riskType: customRiskText,
                    color: getRiskColor('Autre signalement'), // Autre signalement
                    userId: user.id,
                  };

                  fetch(`${BACKEND_URL}/markers/addmarkers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newMarker),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.result) {
                        fetchMarkers();
                        setMarker(null);
                        setCustomRiskText("");
                        setIsCustomRiskModal(false);
                      }
                    })
                    .catch((err) => console.log("Erreur ajout marker", err));
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                  Valider
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: "#ccc", marginTop: 10 },
                ]}
                onPress={() => setIsCustomRiskModal(false)}
              >
                <Text style={{ color: "#000" }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


        {/* --- Bouton "+" Menu Principal --- */}
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setIsBtnMenuModal(true)}
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
    flexDirection: "row",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  // --- Styles pour les boutons de la modale menu ---
  menuButton: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#ddd",
    marginVertical: 5,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  menuButtonText: {
    color: "#333",
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
  deleteModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  deleteModal: {
    width: "75%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  levelModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  levelModal: {
    width: "70%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
  },
  levelCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginHorizontal: 10,
  },
  // --- Styles pour les 3 catégories de dangers ---
  dangerHighButton: {
    backgroundColor: "#f9f9f9",
    padding: 8, 
    borderRadius: 8, 
    marginVertical: 3, 
    width: "100%",
    borderWidth: 0.8, 
    borderColor: "#E57373", 
  },
  dangerHighText: {
    color: "#333",
    fontSize: 14, 
    fontWeight: "600",
    textAlign: "center",
  },
  dangerMediumButton: {
    backgroundColor: "#f9f9f9", 
    padding: 8, 
    borderRadius: 8,
    marginVertical: 3, 
    width: "100%",
    borderWidth: 0.8, 
    borderColor: "#FFB74D", 
  },
  dangerMediumText: {
    color: "#333",
    fontSize: 14, 
    fontWeight: "600",
    textAlign: "center",
  },
  dangerLowButton: {
    backgroundColor: "#f9f9f9", 
    padding: 8, 
    borderRadius: 8, 
    marginVertical: 3, 
    width: "100%",
    borderWidth: 0.8, 
    borderColor: "#FFCC80", 
  },
  dangerLowText: {
    color: "#333",
    fontSize: 14, 
    fontWeight: "600",
    textAlign: "center",
  },
  // --- Styles pour les boutons Autre signalement et Annuler ---
  otherButton: {
    backgroundColor: "#f9f9f9", 
    padding: 10, 
    borderRadius: 8,
    marginVertical: 4,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
    borderWidth: 0.8, 
    borderColor: "#B39DDB", 
  },
  otherButtonText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: "#6C5364", 
    padding: 10, 
    borderRadius: 8,
    marginVertical: 4,
    width: "100%",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});
