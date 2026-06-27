import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ordersService, Order } from '../services/ordersService';
import AppLoader from '../components/AppLoader';

type OrdersListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrdersList'>;

export default function OrdersListScreen() {
  const navigation = useNavigation<OrdersListScreenNavigationProp>();
  const { colors } = useTheme();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await ordersService.getOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  const GOLD = '#D4AF37';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#22C55E';
      case 'shipped':   return '#3B82F6';
      case 'confirmed': return GOLD;
      case 'cancelled': return '#EF4444';
      default:          return 'rgba(255,255,255,0.4)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return 'checkmark-circle' as const;
      case 'shipped':   return 'cube-outline' as const;
      case 'confirmed': return 'checkmark-done-outline' as const;
      case 'cancelled': return 'close-circle-outline' as const;
      default:          return 'time-outline' as const;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmée';
      case 'shipped':
        return 'Expédiée';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <AppLoader variant="inline" size="lg" label="Chargement…" />
        </View>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mes commandes</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="cart-outline" size={64} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Pas de commandes</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Vous n'avez encore rien commandé. Une fois votre première commande passée, elle s'affichera dans cette section.
          </Text>
          <TouchableOpacity
            style={[styles.discoverButton, { backgroundColor: '#D4AF37' }]}
            onPress={() => navigation.navigate('Boutique')}
          >
            <Text style={styles.discoverButtonText}>Découvrir la boutique</Text>
            <Ionicons name="chevron-forward" size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.background === '#000000' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes commandes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {orders.map((order) => {
          const statusColor = getStatusColor(order.status);
          const statusIcon  = getStatusIcon(order.status);
          return (
            <View
              key={order._id}
              style={[styles.orderCard, { borderColor: 'rgba(255,255,255,0.08)' }]}
            >
              {/* Top accent line matching status color */}
              <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />

              {/* Header */}
              <View style={styles.orderHeader}>
                <View style={styles.orderIdWrap}>
                  <Text style={styles.orderId}>
                    #{order._id.slice(-8).toUpperCase()}
                  </Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
                  <Ionicons name={statusIcon} size={12} color={statusColor} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.orderItems}>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <View style={styles.itemDot} />
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                      <Text style={styles.itemQty}>  ×{item.quantity}</Text>
                    </Text>
                    <Text style={styles.itemPrice}>
                      {(item.price * item.quantity).toFixed(0)} DT
                    </Text>
                  </View>
                ))}
              </View>

              {/* Total row */}
              <View style={styles.orderTotal}>
                <View style={styles.paymentMethod}>
                  <Ionicons
                    name="document-text-outline"
                    size={13}
                    color="rgba(255,255,255,0.4)"
                  />
                  <Text style={styles.paymentMethodText}>
                    Commande standard
                  </Text>
                </View>
                <View style={styles.totalRight}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{order.totalPrice.toFixed(0)} DT</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  orderCard: {
    backgroundColor: '#0E0E0E',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: { height: 3, width: '100%' },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 10,
  },
  orderIdWrap: {},
  orderId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  orderDate: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderItems: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  itemName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  itemQty: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#fff' },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  paymentMethodText: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  totalRight: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  totalValue: { fontSize: 17, fontWeight: '800', color: '#D4AF37' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  discoverButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

