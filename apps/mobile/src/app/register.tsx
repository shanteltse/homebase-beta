import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../lib/auth-context";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signUp(name, email, password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>HomeBase</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          style={[styles.input, styles.inputMarginSmall]}
          placeholder="Name"
          placeholderTextColor="#8a7f78"
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />

        <TextInput
          style={[styles.input, styles.inputMarginSmall]}
          placeholder="Email"
          placeholderTextColor="#8a7f78"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={[styles.input, styles.inputMarginLarge]}
          placeholder="Password"
          placeholderTextColor="#8a7f78"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.back()}
        >
          <Text style={styles.linkText}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7f4",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    color: "#b08068",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#8a7f78",
    marginBottom: 40,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#4a3f3a",
  },
  inputMarginSmall: {
    marginBottom: 12,
  },
  inputMarginLarge: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#b08068",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#b08068",
    fontSize: 14,
  },
});
