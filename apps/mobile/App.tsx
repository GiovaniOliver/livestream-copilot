import React, { useEffect, useState } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator, StyleSheet, AppState } from "react-native";

// Auth screens
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";

// Main app screens
import SessionPickerScreen from "./src/screens/SessionPickerScreen";
import SessionSetupScreen from "./src/screens/SessionSetupScreen";
import LiveSessionScreen from "./src/screens/LiveSessionScreen";
import StreamerDashboard from "./src/screens/StreamerDashboard";
import PodcastDashboard from "./src/screens/PodcastDashboard";
import CaptureScreen from "./src/screens/CaptureScreen";
import OBSControlScreen from "./src/screens/OBSControlScreen";
import VideoSourceScreen from "./src/screens/VideoSourceScreen";

// Stores
import { useAuthStore } from "./src/stores/authStore";
import { useConnectionStore } from "./src/stores/connectionStore";

// Logger
import logger from "./src/services/logger";

// Theme
import { colors } from "./src/theme";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  SessionPicker: undefined;
  SessionSetup: { workflowId: string };
  LiveSession: { sessionId: string; workflowId: string; baseUrl: string; wsUrl: string };
  StreamerDashboard: { sessionId: string; workflowId: string; baseUrl: string; wsUrl: string };
  PodcastDashboard: { sessionId: string; workflowId: string; baseUrl: string; wsUrl: string };
  Capture: { workflowId: string; baseUrl: string };
  OBSControl: { baseUrl: string };
  VideoSource: { baseUrl: string };
};

export type RootStackParamList = AuthStackParamList & MainStackParamList;

// =============================================================================
// NAVIGATORS
// =============================================================================

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// =============================================================================
// NAVIGATION THEME
// =============================================================================

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg0,
    card: "rgba(0,0,0,0.35)",
    text: colors.text,
    border: "rgba(255,255,255,0.12)",
    primary: colors.teal,
    notification: colors.purple,
  },
};

// =============================================================================
// AUTH NAVIGATOR
// =============================================================================

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg0 },
      }}
    >
      <AuthStack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onRegisterPress={() => props.navigation.navigate("Register")}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {(props) => (
          <RegisterScreen
            {...props}
            onLoginPress={() => props.navigation.navigate("Login")}
            onSuccess={() => props.navigation.navigate("Login")}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

// =============================================================================
// MAIN APP NAVIGATOR
// =============================================================================

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerTransparent: true,
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg0 },
      }}
    >
      <MainStack.Screen
        name="SessionPicker"
        component={SessionPickerScreen}
        options={{ title: "Choose workflow" }}
      />
      <MainStack.Screen
        name="SessionSetup"
        component={SessionSetupScreen}
        options={{ title: "Session setup" }}
      />
      <MainStack.Screen
        name="LiveSession"
        component={LiveSessionScreen}
        options={{ title: "Live session" }}
      />
      <MainStack.Screen
        name="StreamerDashboard"
        component={StreamerDashboard}
        options={{ title: "Live Streamer" }}
      />
      <MainStack.Screen
        name="PodcastDashboard"
        component={PodcastDashboard}
        options={{ title: "Podcast" }}
      />
      <MainStack.Screen
        name="Capture"
        component={CaptureScreen}
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <MainStack.Screen
        name="OBSControl"
        component={OBSControlScreen}
        options={{ title: "OBS Remote" }}
      />
      <MainStack.Screen
        name="VideoSource"
        component={VideoSourceScreen}
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
    </MainStack.Navigator>
  );
}

// =============================================================================
// LOADING SCREEN
// =============================================================================

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.teal} />
    </View>
  );
}

// =============================================================================
// ROOT APP
// =============================================================================

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    loadStoredAuth,
    checkBiometricAvailability,
    validateSession,
    updateActivity,
  } = useAuthStore();
  const { baseUrl, loadStoredBaseUrl } = useConnectionStore();
  const [isReady, setIsReady] = useState(false);

  // Initialize app
  useEffect(() => {
    async function prepare() {
      try {
        // Load stored configuration
        await Promise.all([
          loadStoredAuth(),
          loadStoredBaseUrl(),
        ]);

        // Check biometric availability
        await checkBiometricAvailability();

        // Validate session if authenticated
        if (isAuthenticated) {
          await validateSession(baseUrl);
        }
      } catch (error) {
        logger.error("Initialization error:", error);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  // Handle app state changes for session validation
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active" && isAuthenticated) {
        // Update activity timestamp when app becomes active
        updateActivity();

        // Validate session (check timeout and refresh token if needed)
        const isValid = await validateSession(baseUrl);
        if (!isValid) {
          logger.info("Session validation failed, user will be logged out");
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, baseUrl]);

  // Show loading screen while initializing
  if (!isReady || isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg0,
  },
});
