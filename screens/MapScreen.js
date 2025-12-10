import { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Dimensions,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { importMarkers } from "../reducers/markers";

export default function MapScreen() {
  const [position, setPosition] = useState(null);
  const [marker, setMarker] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const mapRef = useRef(null);
  const dispatch = useDispatch();
  const markersInStore = useSelector((state) => state.marker.markers);
  const user = useSelector((state) => state.user.value);

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
      onPress={(e) => setSelectedMarker(m)}
      onDeselect={() => setSelectedMarker(null)}
    />
  ));
  console.log(selectedMarker, user._id);
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
      userId: "6939368e4b25e76a7a1cd25d", //  temporaire
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
    // setMarker(null);
  };

  const handleMarkerPress = (marker) => {
    if (marker.user !== user.token) {
      // temporaire
      return alert("Vous ne pouvez pas supprimer ce signalement");
    }

    fetch(`http://192.168.100.192:3000/markers/${marker._id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.token }),
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

                {selectedMarker.user === "64a7f4e2b4c2f5d1e4a5b6c7" && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleMarkerPress(selectedMarker)}
                  >
                    <Text style={{ color: "white", fontSize: 18 }}>
                      {" "}
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "gray" }]}
                  onPress={() => setSelectedMarker(null)}
                >
                  <Text style={{ color: "white" }}>Fermer</Text>
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
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 15,
    fontWeight: "bold",
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
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
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
});
