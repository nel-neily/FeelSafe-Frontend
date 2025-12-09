import { Text, TouchableOpacity, StyleSheet, View } from "react-native";

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LoginScreen</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.replace("TabNavigator")} // ← remplace Login par TabNavigator
      >
        <Text style={styles.buttonText}>Aller à la Map</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, marginBottom: 20 },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontSize: 18 },
});