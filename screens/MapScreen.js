import { useEffect, useState, useRef, use } from "react";
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
  
  const mapRef = useRef(null);
  const dispatch = useDispatch();
  // const [markersFromDB, setMarkersFromDB] = useState([]);

  const markersInStore = useSelector((state) => state.marker.markers);

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
    return alert("Vous ne pouvez pas supprimer ce signalement");
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
              
              {/* <Text style={styles.sectionTitle}>Votre destination</Text> */}
              <View style={styles.inputContainer}>
                <FontAwesome name="search" size={20} color="#666" />
                <Text style={styles.inputPlaceholder}>Saisissez une adresse...</Text>
              </View>

              {/* <Text style={styles.sectionTitle}>Vos adresses favorites</Text> */}
              <View style={[styles.favoritesPlaceholder, { marginTop: 20 }]}>
                <Text style={styles.placeholderText}>
                  Vos adresses favorites
                </Text>
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
  placeholderText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
});
