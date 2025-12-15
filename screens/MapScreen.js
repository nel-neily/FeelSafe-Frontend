import { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Dimensions,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { importMarkers } from "../reducers/markers";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { utilFetch, utilGetFetch } from "../utils/function";
import AddressSearch from "../components/AdressSearch";

export default function MapScreen() {
  const [position, setPosition] = useState(null);
  const [marker, setMarker] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // --- État pour la modale Menu du bouton '+' ---
  const [isBtnMenuModal, setIsBtnMenuModal] = useState(false);

  // --- États pour les destinations ---
  const [isDestinationModal, setIsDestinationModal] = useState(false);
  const [destinationMarker, setDestinationMarker] = useState(null); // Coordonnées de la destination

  const mapRef = useRef(null);

  const markersInStore = useSelector((state) => state.marker.markers);
  const user = useSelector((state) => state.user.value);

  // --- Redux (markers) ---
  const dispatch = useDispatch();

  // --- Récupération des adresses favorites (vide si pas de compte) ---
  const favoriteAddresses = user.addresses || [];

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isMarkerModalVisible, setIsMarkerModalVisible] = useState(false);
  // Modal personnalisé pour le risque 'Autre signalement'
  const [isCustomRiskModal, setIsCustomRiskModal] = useState(false);
  const [customRiskText, setCustomRiskText] = useState("");
  const [routeCoords, setRouteCoords] = useState([]); // Itinéraire entre position et destination

  // Cette fonction fetch les markers en DB et les stock sur redux
  const fetchMarkers = async () => {
    try {
      const url = "/markers";
      const data = await utilGetFetch(url);
      if (data.result) {
        dispatch(importMarkers(data.markers)); // on stocke dans le store
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkerPress = (marker) => {
    setSelectedMarker(marker);
    setIsMarkerModalVisible(true);
  };
  // Cette variable affiche les markers depuis le store
  const displayMarkersFromDB = markersInStore.map((m) => {
    return (
      <Marker
        key={m._id}
        coordinate={{ latitude: m.latitude, longitude: m.longitude }}
        title={m.riskType}
        pinColor={m.color}
        onPress={(e) => handleMarkerPress(m)}
        onDeselect={() => {
          setSelectedMarker(null);
          setIsMarkerModalVisible(false);
        }}
      />
    );
  });

  // Ce useEffect demande l'autorisation de géolocalisation au user
  // Ce useEffect appelle la fonction fetchMarkers() en dernier
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
        Location.watchPositionAsync(
          { distanceInterval: 20, accuracy: Location.Accuracy.Low },
          (location) => {
            if (location.coords.speed < 1) {
              return;
            }
            setPosition(location.coords);

            mapRef.current?.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        );
      }
    })();
    fetchMarkers(); // récupération au montage
  }, []);

  // Zoom automatique UNE FOIS QUE la Polyline est réellement rendue
  useEffect(() => {
    if (
      routeCoords.length >= 2 &&
      routeCoords.every(
        (p) =>
          p && typeof p.latitude === "number" && typeof p.longitude === "number"
      )
    ) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  }, [routeCoords]);

  // --- Fonction pour centrer la carte sur une destination + calcul itinéraire ---
  const goToDestination = async (latitude, longitude) => {
    if (!position) return; // ⭐ sécurité : position actuelle obligatoire

    // ⭐ affiche le marker de destination
    setDestinationMarker({ latitude, longitude });

    try {
      //  appel backend pour calculer l’itinéraire
      const data = await utilFetch("/directions", "POST", {
        start: {
          latitude: position.latitude,
          longitude: position.longitude,
        },
        end: {
          latitude,
          longitude,
        },
      });

      

      //  on stocke les coordonnées du trajet + format polyline
if (data.result && Array.isArray(data.route)) {
      const formattedRoute = data.route.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      }));

    setRouteCoords(formattedRoute);
  }
} catch (err) {
  console.error("Erreur itinéraire", err);
}

// Fermer la modale
setIsDestinationModal(false);
  };

  // Fonction de création marker après un long press
  // Elle déclenche une modale pour personnaliser le marker
  // @params: event React Native Maps qui contient des coordonnées
  const handleLongPress = (event) => {
    const newCoords = event.nativeEvent.coordinate;
    setMarker(newCoords);
    setIsModalVisible(true);
  };

  // Cette fonction sert à la création d'un marker
  // Elle permet de construire le marker et de le personnaliser et de l'ajouter en DB
  // @params: string

  const handleSelectRisk = async (risk) => {
    if (!user.id) return;

    if (risk === "Autre signalement" && customRiskText.trim().length === 0) {
      return alert("Votre message est vide.");
    }

    const color = getRiskColor(risk);

    const markerCoords = {
      latitude: position.latitude,
      longitude: position.longitude,
    };

    // Construit le marker avec des coordonnées soit héritées d'un LongPress, soit de notre position actuelle
    const newMarker = {
      latitude: marker ? marker.latitude : markerCoords.latitude,
      longitude: marker ? marker.longitude : markerCoords.longitude,
      riskType: risk,
      color: color,
      userId: user.id,
    };
    try {
      const url = "/markers/addmarkers";
      const data = await utilFetch(url, "POST", newMarker);
      if (data.result) {
        fetchMarkers();
        setMarker(null);
        setIsModalVisible(false);
        setCustomRiskText("");
        setIsCustomRiskModal(false);
      }
    } catch (err) {
      console.error("Erreur ajout marker", err);
    }
  };

  // Cette fonction supprime un marker et a une vérification => l'id utilisateur est identique à celui ramené par le marker
  // @params: marker(id, color, coordonnées, et la clé étrangère user
  const handleMarkerDelete = async (marker) => {
    if (marker.users._id !== user.id) {
      return alert("Vous ne pouvez pas supprimer ce signalement");
    }

    try {
      const url = `/markers/${marker._id}`;
      const data = await utilFetch(url, "DELETE", { userId: user.id });

      if (data.result) {
        fetchMarkers(); // Refresh la map
        setIsMarkerModalVisible(false); // ferme le popup
      }
    } catch (err) {
      console.error("Une erreur s'est produite lors du delete du pin");
    }
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

  // Cette fonction permet de retourner une couleur en fonction du params risk que l'on lui passe
  // @params risk: string
  // @return: string
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
      ["Animal sauvage", "Zone mal éclairée", "Route endommagée"].includes(risk)
    ) {
      return "#FFEB3B";
    }
    // Autre signalement
    return "#A66CFF";
  };
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);

    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

          {/* TRACE L’ITINÉRAIRE UNIQUEMENT SI LES COORDONNÉES SONT VALIDES */}
          {Array.isArray(routeCoords) &&
            routeCoords.length >= 2 &&
            routeCoords.every(
              (p) =>
                p &&
                typeof p.latitude === "number" &&
                typeof p.longitude === "number"
            ) && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={4}
                strokeColor="#52c7e1ff"
              />
            )}

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

        <Modal
          animationType="fade"
          transparent={true}
          visible={isMarkerModalVisible}
          onRequestClose={() => setIsMarkerModalVisible(false)}
        >
          <View style={styles.deleteModalContainer}>
            {selectedMarker && (
              <View style={styles.deleteModal}>
                <Text style={styles.modalTitle}>
                  {selectedMarker?.riskType}
                </Text>
                <Text
                  style={{ fontSize: 16, color: "#010101ff", marginBottom: 8 }}
                >
                  Signalé le {formatDateTime(selectedMarker?.createdAt)}
                </Text>
                {selectedMarker?.users._id === user.id && (
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => handleMarkerDelete(selectedMarker)}
                  >
                    <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.menuButton]}
                  onPress={() => setIsMarkerModalVisible(false)}
                >
                  <Text style={styles.menuButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>

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
                <Text style={styles.otherButtonText}>Autre signalement</Text>
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

              <AddressSearch page={"Map"} goToDestination={goToDestination} />
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
                onPress={() => handleSelectRisk("Autre signalement")}
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
