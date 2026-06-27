import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAuthToken } from '../utils/authStorage';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ordersService, Order } from '../services/ordersService';
import api from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useOrdersStore } from '../store/ordersStore';
import { useAuthStore } from '../store/authStore';
import AppLoader from '../components/AppLoader';
import { useSnackbar } from '../components/Snackbar';

type PaymentSuccessScreenRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;
type PaymentSuccessScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PaymentSuccess'>;

export default function PaymentSuccessScreen() {
  const navigation = useNavigation<PaymentSuccessScreenNavigationProp>();
  const route = useRoute<PaymentSuccessScreenRouteProp>();
  const { colors } = useTheme();
  const { showSnackbar } = useSnackbar();
  const { clearCart } = useCartStore();
  const token = useAuthStore((state) => state.token);
  const { orderId, order: orderFromParams } = route.params;
  const lastOrder = useOrdersStore((s) => s.lastOrder);

  // Prefer: params → store cache → fetch from API
  const resolvedOrder = orderFromParams ?? (lastOrder?._id === orderId ? lastOrder : null);

  const [order, setOrder] = useState<Order | null>(resolvedOrder || null);
  const [loading, setLoading] = useState(!resolvedOrder); // Only load if order not found locally
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (resolvedOrder) {
      setOrder(resolvedOrder);
      setLoading(false);
      clearCart();
    } else {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const orderData = await ordersService.getOrder(orderId);
      setOrder(orderData);
      // Clear cart as a safety measure when order is loaded (in case it wasn't cleared earlier)
      // This ensures cart is always empty when viewing order confirmation
      await clearCart();
    } catch (error) {
      console.error('Error loading order:', error);
      showSnackbar({
        message: 'Impossible de charger les détails de la commande.',
        duration: 2800,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!order) return;

    setDownloadingPDF(true);
    try {
      // Get base URL from API config
      const baseURL = api.defaults.baseURL;
      if (!baseURL) throw new Error('Configuration API manquante. Veuillez redémarrer l\'application.');
      const pdfUrl = `${baseURL}/orders/${orderId}/pdf`;
      
      // Get cache directory (fallback to document directory if cache is not available)
      // Note: In legacy API, these might be async or need to be accessed differently
      let cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
        cacheDir = FileSystem.documentDirectory;
      }
      if (!cacheDir) {
        // Last resort: use a temporary path
        cacheDir = FileSystem.cacheDirectory || '';
      }
      
      if (!cacheDir) {
        throw new Error('Impossible d\'accéder au répertoire de fichiers. Veuillez réessayer.');
      }
      
      const fileName = `order_${order.reference}.pdf`;
      const fileUri = cacheDir.endsWith('/') ? `${cacheDir}${fileName}` : `${cacheDir}/${fileName}`;
      
      console.log('📥 Downloading PDF from:', pdfUrl);
      console.log('💾 Saving to:', fileUri);
      console.log('📁 Cache directory:', cacheDir);
      console.log('📁 Document directory:', FileSystem.documentDirectory);

      // Get auth token if available
      const authHeaders: Record<string, string> = {};
      try {
        const token = await getAuthToken();
        if (token) {
          authHeaders.Authorization = `Bearer ${token}`;
          console.log('🔑 Auth token found for PDF download');
        }
      } catch (error) {
        console.log('ℹ️ No auth token available for PDF download (guest user)');
      }

      // Download the PDF
      const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri, {
        headers: authHeaders,
      });

      console.log('📥 Download result:', {
        status: downloadResult.status,
        uri: downloadResult.uri,
        headers: downloadResult.headers,
      });

      if (downloadResult.status === 200) {
        console.log('✅ PDF downloaded successfully:', downloadResult.uri);
        
        // Verify file exists
        const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
        if (!fileInfo.exists) {
          throw new Error('Le fichier PDF n\'a pas été créé');
        }

        console.log('📄 File info:', fileInfo);
        
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          try {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: 'application/pdf',
              dialogTitle: `Récapitulatif de commande ${order.reference}`,
            });
          } catch (shareError: any) {
            console.error('Share error:', shareError);
            showSnackbar({
              message: 'PDF téléchargé avec succès. Disponible dans vos fichiers.',
              duration: 2600,
            });
          }
        } else {
          showSnackbar({
            message: 'PDF téléchargé avec succès. Disponible dans vos fichiers.',
            duration: 2600,
          });
        }
      } else {
        throw new Error(`Le téléchargement a échoué avec le statut: ${downloadResult.status}`);
      }
    } catch (error: any) {
      console.error('❌ PDF download error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      let errorMessage = 'Impossible de télécharger le récapitulatif PDF';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Erreur: ${error.code}`;
      }
      
      showSnackbar({
        message: errorMessage,
        duration: 3000,
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading || !order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <AppLoader variant="inline" size="lg" label="Chargement…" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Merci !</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Message */}
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: '#D4AF37' }]}>
            <Ionicons name="checkmark" size={48} color="#000000" />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Commande confirmée
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Un email de confirmation a été envoyé à votre adresse.
          </Text>
        </View>

        {/* Order Details */}
        <View style={[styles.detailsContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.detailsTitle, { color: colors.text }]}>Détails de la commande</Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Nº de référence</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{order.reference}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date et heure</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(order.createdAt)}
            </Text>
          </View>

          <View style={[styles.detailRow, styles.finalRow]}>
            <Text style={[styles.detailLabel, { color: colors.text }]}>Total commande</Text>
            <Text style={[styles.detailValue, { color: colors.text, fontSize: 18, fontWeight: '700' }]}>
              {order.totalPrice.toFixed(0)} DT
            </Text>
          </View>
        </View>

        {token && (
          <TouchableOpacity
            style={[styles.pdfButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={handleDownloadPDF}
            disabled={downloadingPDF}
          >
            {downloadingPDF ? (
              <AppLoader variant="button" size="sm" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color={colors.text} />
                <Text style={[styles.pdfButtonText, { color: colors.text }]}>
                  Récapitulatif PDF
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Done Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: '#D4AF37' }]}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          }}
        >
          <Text style={styles.doneButtonText}>Terminé</Text>
          <Ionicons name="checkmark-circle" size={20} color="#000000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  detailsContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  finalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  pdfButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  doneButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
