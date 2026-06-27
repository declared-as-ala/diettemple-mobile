import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@diettemple_search_history';
const MAX_HISTORY_ITEMS = 20;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export const searchHistoryService = {
  // Get all search history
  getHistory: async (): Promise<string[]> => {
    try {
      const historyData = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (historyData) {
        const history: SearchHistoryItem[] = JSON.parse(historyData);
        // Return only the queries, sorted by most recent first
        return history
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((item) => item.query);
      }
      return [];
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  },

  // Add a search to history
  addSearch: async (query: string): Promise<void> => {
    try {
      if (!query || query.trim().length === 0) {
        return;
      }

      const trimmedQuery = query.trim();
      const historyData = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      let history: SearchHistoryItem[] = historyData ? JSON.parse(historyData) : [];

      // Remove duplicate entries (case-insensitive)
      history = history.filter(
        (item) => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
      );

      // Add new search at the beginning
      history.unshift({
        query: trimmedQuery,
        timestamp: Date.now(),
      });

      // Keep only the most recent MAX_HISTORY_ITEMS
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }

      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  },

  // Remove a specific search from history
  removeSearch: async (query: string): Promise<void> => {
    try {
      const historyData = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (historyData) {
        let history: SearchHistoryItem[] = JSON.parse(historyData);
        history = history.filter(
          (item) => item.query.toLowerCase() !== query.toLowerCase()
        );
        await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      }
    } catch (error) {
      console.error('Error removing search from history:', error);
    }
  },

  // Clear all search history
  clearHistory: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  },
};









