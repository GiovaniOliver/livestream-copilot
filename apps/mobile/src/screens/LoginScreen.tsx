/**
 * Login Screen
 *
 * Enhanced authentication screen with:
 * - Email/password login
 * - OAuth providers (Google, GitHub, Twitch)
 * - Biometric authentication (Face ID, Touch ID)
 * - Remember me functionality
 * - Email validation feedback
 * - Better error messages
 * - Loading states and animations
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Animated,
} from "react";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "../stores/authStore";
import { useConnectionStore } from "../stores/connectionStore";
import { colors } from "../theme";
import * as BiometricAuth from "../services/biometricAuth";

// OAuth provider configuration
const OAUTH_PROVIDERS = [
  { id: "google", name: "Google", color: "#4285F4", icon: "G" },
  { id: "github", name: "GitHub", color: "#333333", icon: "GH" },
  { id: "twitch", name: "Twitch", color: "#9146FF", icon: "TW" },
];

interface LoginScreenProps {
  onRegisterPress: () => void;
}

export default function LoginScreen({ onRegisterPress }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [biometricCapability, setBiometricCapability] = useState<BiometricAuth.BiometricCapabilities | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const {
    login,
    isLoading,
    error,
    clearError,
    biometricEnabled,
    biometricAvailable,
    checkBiometricAvailability,
    authenticateWithBiometric,
  } = useAuthStore();
  const { baseUrl } = useConnectionStore();

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
    BiometricAuth.checkBiometricCapabilities().then(setBiometricCapability);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Attempt biometric login on mount if enabled
  useEffect(() => {
    if (biometricEnabled && biometricAvailable) {
      handleBiometricLogin();
    }
  }, [biometricEnabled, biometricAvailable]);

  // Email validation
  const validateEmail = useCallback((email: string) => {
    if (!email) {
      setEmailError("");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    setEmailError("");
    return true;
  }, []);

  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (text) {
        validateEmail(text);
      } else {
        setEmailError("");
      }
    },
    [validateEmail]
  );

  const handleLogin = useCallback(async () => {
    // Clear previous errors
    clearError();

    // Validate inputs
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Email", "Please enter your email address");
      return;
    }

    if (!validateEmail(email.trim())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid Email", emailError);
      return;
    }

    if (!password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Password", "Please enter your password");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await login(email.trim(), password, baseUrl, rememberMe);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [email, password, rememberMe, baseUrl, login, validateEmail, emailError]);

  const handleBiometricLogin = useCallback(async () => {
    if (!biometricEnabled || !biometricAvailable) {
      return;
    }

    try {
      const success = await authenticateWithBiometric();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // User is authenticated via biometric, tokens should already be loaded
      }
    } catch (err) {
      console.error("[LoginScreen] Biometric login failed:", err);
    }
  }, [biometricEnabled, biometricAvailable, authenticateWithBiometric]);

  const handleOAuthLogin = useCallback(
    async (provider: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Open OAuth URL in browser
      const oauthUrl = `${baseUrl}/api/v1/auth/oauth/${provider}`;

      try {
        const result = await WebBrowser.openAuthSessionAsync(
          oauthUrl,
          `livestreamcopilot://auth/callback`
        );

        if (result.type === "success" && result.url) {
          // Parse the callback URL for tokens
          const url = new URL(result.url);
          const accessToken = url.searchParams.get("accessToken");
          const refreshToken = url.searchParams.get("refreshToken");

          if (accessToken && refreshToken) {
            // Handle OAuth callback (tokens will be stored by the store)
            await useAuthStore.getState().handleOAuthCallback(
              accessToken,
              refreshToken,
              rememberMe
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            throw new Error("Failed to get authentication tokens");
          }
        } else if (result.type === "cancel") {
          // User cancelled OAuth
          console.log("[LoginScreen] OAuth cancelled by user");
        }
      } catch (err) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "OAuth Error",
          `Failed to sign in with ${provider}. Please try again.`
        );
        console.error("[LoginScreen] OAuth error:", err);
      }
    },
    [baseUrl, rememberMe]
  );

  const handleForgotPassword = useCallback(() => {
    if (!email.trim()) {
      Alert.alert(
        "Enter Email",
        "Please enter your email address first, then tap Forgot Password"
      );
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    Alert.alert(
      "Reset Password",
      `A password reset link will be sent to ${email}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            try {
              await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
              });
              Alert.alert(
                "Check Your Email",
                "If an account exists with this email, you will receive a password reset link."
              );
            } catch (err) {
              Alert.alert("Error", "Failed to send reset email. Please try again.");
            }
          },
        },
      ]
    );
  }, [email, baseUrl, validateEmail]);

  const getBiometricButtonText = () => {
    if (!biometricCapability) return "Use Biometric";
    const types = biometricCapability.supportedTypes;
    return `Sign in with ${BiometricAuth.getBiometricTypeName(types)}`;
  };

  return (
    <LinearGradient colors={[colors.bg0, colors.bg1]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Logo/Title */}
            <View style={styles.header}>
              <Text style={styles.title}>FluxBoard</Text>
              <Text style={styles.subtitle}>
                Transform your streams into content
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={clearError}>
                  <Text style={styles.errorDismiss}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Biometric Login Button */}
            {biometricEnabled && biometricAvailable && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
              >
                <Text style={styles.biometricButtonText}>
                  {getBiometricButtonText()}
                </Text>
              </TouchableOpacity>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : null]}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isLoading}
              />
              {emailError && (
                <Text style={styles.validationError}>{emailError}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.showPasswordBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.optionsRow}>
              <View style={styles.rememberMeContainer}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: "#767577", true: colors.teal }}
                  thumbColor={rememberMe ? "#fff" : "#f4f3f4"}
                  disabled={isLoading}
                />
                <Text style={styles.rememberMeText}>Remember me</Text>
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.bg0} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* OAuth Buttons */}
            <View style={styles.oauthContainer}>
              {OAUTH_PROVIDERS.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.oauthButton,
                    { backgroundColor: provider.color },
                  ]}
                  onPress={() => handleOAuthLogin(provider.id)}
                  disabled={isLoading}
                >
                  <Text style={styles.oauthIcon}>{provider.icon}</Text>
                  <Text style={styles.oauthText}>{provider.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onRegisterPress} disabled={isLoading}>
                <Text style={styles.registerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    color: "#EF4444",
    flex: 1,
    marginRight: 12,
    fontSize: 14,
  },
  errorDismiss: {
    color: "#EF4444",
    fontWeight: "600",
  },
  biometricButton: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  biometricButtonText: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  validationError: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordBtn: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  showPasswordText: {
    color: colors.teal,
    fontWeight: "500",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rememberMeText: {
    color: colors.text,
    fontSize: 14,
  },
  forgotPassword: {
    padding: 4,
  },
  forgotPasswordText: {
    color: colors.teal,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: colors.bg0,
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  dividerText: {
    color: colors.textMuted,
    marginHorizontal: 16,
    fontSize: 14,
  },
  oauthContainer: {
    gap: 12,
  },
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  oauthIcon: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  oauthText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  registerText: {
    color: colors.textMuted,
  },
  registerLink: {
    color: colors.teal,
    fontWeight: "600",
  },
});
