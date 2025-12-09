import { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Dimensions,
  View,
  Text,
  Modal,
  TouchableOpacity,
} from "react-native";
import {useDispatch, useSelector} from "react-redux";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { importMarkers } from "../reducers/markers";

export default function MapScreen() {
  const [position, setPosition] = useState(null);
  const [marker, setMarker] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const mapRef = useRef(null);
  const dispatch = useDispatch();
  const [markersFromDB, setMarkersFromDB] = useState([]);

  const fetchMarkers = async () => {
    fetch("http://192.168.100.192:3000/markers")
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          importMarkers
          setMarkersFromDB(data.markers); // on stocke dans l'état
        }
      })
      .catch((err) => {
        console.log("Erreur fetch markers", err);
      });
  };

  console.log(markersFromDB, "State");
  const displayMarkersFromDB = markersFromDB.map((m, index) => {
    return (
      <Marker
        key={index}
        coordinate={{ latitude: m.latitude, longitude: m.longitude }}
        pinColor={m.color}
        title={m.riskType}
      />
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
    // Ici, envoyer le marker + risk au backend
    fetchMarkers();
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
          {marker && (
            <Marker
              coordinate={marker} // affiche le marker long press
              title="Nouvelle alerte"
            />
          )}
          {displayMarkersFromDB}
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

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSelectRisk("Suggestion")} //  choix 1
              >
                <Text style={styles.modalButtonText}>Suggestion</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSelectRisk("Suggestion")} //  choix 2
              >
                <Text style={styles.modalButtonText}>Suggestion</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#aaa" }]}
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
