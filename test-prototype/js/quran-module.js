/**
 * Quran Testing Module
 *
 * This module provides a complete interface for testing Quran-related API endpoints
 * including Surah retrieval, Ayah fetching, and full-text search functionality.
 *
 * Features:
 * - Fetch complete Surahs with Arabic and English translations
 * - Search Quran text with highlighted results
 * - Get specific Ayahs by reference
 * - Proper Arabic text rendering (RTL support)
 * - Loading states and error handling
 * - Responsive UI with modern design
 */

class QuranTester {
  /**
   * Initialize the Quran Tester
   * @param {ApiClient} apiClient - The API client instance for making requests
   */
  constructor(apiClient) {
    this.api = apiClient;
    this.currentSurah = null;
    this.searchResults = null;

    // DOM element references (initialized in init())
    this.elements = {
      surahSelect: null,
      surahLangSelect: null,
      surahBtn: null,
      surahDisplay: null,
      searchInput: null,
      searchLangSelect: null,
      searchLimitInput: null,
      searchBtn: null,
      searchResults: null,
      ayahSurahInput: null,
      ayahNumberInput: null,
      ayahLangSelect: null,
      ayahBtn: null,
      ayahDisplay: null,
      loadingIndicator: null
    };
  }

  /**
   * Initialize the module and set up event listeners
   */
  init() {
    console.log('Initializing Quran Tester module...');

    // Cache DOM elements
    this.elements.surahSelect = document.getElementById('surah-select');
    this.elements.surahLangSelect = document.getElementById('surah-lang-select');
    this.elements.surahBtn = document.getElementById('get-surah-btn');
    this.elements.surahDisplay = document.getElementById('surah-display');

    this.elements.searchInput = document.getElementById('search-query');
    this.elements.searchLangSelect = document.getElementById('search-lang-select');
    this.elements.searchLimitInput = document.getElementById('search-limit');
    this.elements.searchBtn = document.getElementById('search-quran-btn');
    this.elements.searchResults = document.getElementById('search-results');

    this.elements.ayahSurahInput = document.getElementById('ayah-surah');
    this.elements.ayahNumberInput = document.getElementById('ayah-number');
    this.elements.ayahLangSelect = document.getElementById('ayah-lang-select');
    this.elements.ayahBtn = document.getElementById('get-ayah-btn');
    this.elements.ayahDisplay = document.getElementById('ayah-display');

    this.elements.loadingIndicator = document.getElementById('loading-indicator');

    // Set up event listeners
    this.setupEventListeners();

    // Populate Surah dropdown
    this.populateSurahDropdown();

    console.log('Quran Tester module initialized successfully');
  }

  /**
   * Set up all event listeners for user interactions
   */
  setupEventListeners() {
    // Get Surah button
    if (this.elements.surahBtn) {
      this.elements.surahBtn.addEventListener('click', () => this.handleGetSurah());
    }

    // Search button
    if (this.elements.searchBtn) {
      this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
    }

    // Search on Enter key
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch();
        }
      });
    }

    // Get Ayah button
    if (this.elements.ayahBtn) {
      this.elements.ayahBtn.addEventListener('click', () => this.handleGetAyah());
    }
  }

  /**
   * Populate the Surah dropdown with all 114 Surahs
   */
  populateSurahDropdown() {
    const surahs = [
      { id: 1, name: 'Al-Fatihah', translation: 'The Opening' },
      { id: 2, name: 'Al-Baqarah', translation: 'The Cow' },
      { id: 3, name: 'Ali \'Imran', translation: 'Family of Imran' },
      { id: 4, name: 'An-Nisa', translation: 'The Women' },
      { id: 5, name: 'Al-Ma\'idah', translation: 'The Table Spread' },
      { id: 6, name: 'Al-An\'am', translation: 'The Cattle' },
      { id: 7, name: 'Al-A\'raf', translation: 'The Heights' },
      { id: 8, name: 'Al-Anfal', translation: 'The Spoils of War' },
      { id: 9, name: 'At-Tawbah', translation: 'The Repentance' },
      { id: 10, name: 'Yunus', translation: 'Jonah' },
      { id: 11, name: 'Hud', translation: 'Hud' },
      { id: 12, name: 'Yusuf', translation: 'Joseph' },
      { id: 13, name: 'Ar-Ra\'d', translation: 'The Thunder' },
      { id: 14, name: 'Ibrahim', translation: 'Abraham' },
      { id: 15, name: 'Al-Hijr', translation: 'The Rocky Tract' },
      { id: 16, name: 'An-Nahl', translation: 'The Bee' },
      { id: 17, name: 'Al-Isra', translation: 'The Night Journey' },
      { id: 18, name: 'Al-Kahf', translation: 'The Cave' },
      { id: 19, name: 'Maryam', translation: 'Mary' },
      { id: 20, name: 'Ta-Ha', translation: 'Ta-Ha' },
      { id: 21, name: 'Al-Anbya', translation: 'The Prophets' },
      { id: 22, name: 'Al-Hajj', translation: 'The Pilgrimage' },
      { id: 23, name: 'Al-Mu\'minun', translation: 'The Believers' },
      { id: 24, name: 'An-Nur', translation: 'The Light' },
      { id: 25, name: 'Al-Furqan', translation: 'The Criterion' },
      { id: 26, name: 'Ash-Shu\'ara', translation: 'The Poets' },
      { id: 27, name: 'An-Naml', translation: 'The Ant' },
      { id: 28, name: 'Al-Qasas', translation: 'The Stories' },
      { id: 29, name: 'Al-\'Ankabut', translation: 'The Spider' },
      { id: 30, name: 'Ar-Rum', translation: 'The Romans' },
      { id: 31, name: 'Luqman', translation: 'Luqman' },
      { id: 32, name: 'As-Sajdah', translation: 'The Prostration' },
      { id: 33, name: 'Al-Ahzab', translation: 'The Combined Forces' },
      { id: 34, name: 'Saba', translation: 'Sheba' },
      { id: 35, name: 'Fatir', translation: 'Originator' },
      { id: 36, name: 'Ya-Sin', translation: 'Ya Sin' },
      { id: 37, name: 'As-Saffat', translation: 'Those who set the Ranks' },
      { id: 38, name: 'Sad', translation: 'The Letter Sad' },
      { id: 39, name: 'Az-Zumar', translation: 'The Troops' },
      { id: 40, name: 'Ghafir', translation: 'The Forgiver' },
      { id: 41, name: 'Fussilat', translation: 'Explained in Detail' },
      { id: 42, name: 'Ash-Shuraa', translation: 'The Consultation' },
      { id: 43, name: 'Az-Zukhruf', translation: 'The Ornaments of Gold' },
      { id: 44, name: 'Ad-Dukhan', translation: 'The Smoke' },
      { id: 45, name: 'Al-Jathiyah', translation: 'The Crouching' },
      { id: 46, name: 'Al-Ahqaf', translation: 'The Wind-Curved Sandhills' },
      { id: 47, name: 'Muhammad', translation: 'Muhammad' },
      { id: 48, name: 'Al-Fath', translation: 'The Victory' },
      { id: 49, name: 'Al-Hujurat', translation: 'The Rooms' },
      { id: 50, name: 'Qaf', translation: 'The Letter Qaf' },
      { id: 51, name: 'Adh-Dhariyat', translation: 'The Winnowing Winds' },
      { id: 52, name: 'At-Tur', translation: 'The Mount' },
      { id: 53, name: 'An-Najm', translation: 'The Star' },
      { id: 54, name: 'Al-Qamar', translation: 'The Moon' },
      { id: 55, name: 'Ar-Rahman', translation: 'The Beneficent' },
      { id: 56, name: 'Al-Waqi\'ah', translation: 'The Inevitable' },
      { id: 57, name: 'Al-Hadid', translation: 'The Iron' },
      { id: 58, name: 'Al-Mujadila', translation: 'The Pleading Woman' },
      { id: 59, name: 'Al-Hashr', translation: 'The Exile' },
      { id: 60, name: 'Al-Mumtahanah', translation: 'She that is to be examined' },
      { id: 61, name: 'As-Saf', translation: 'The Ranks' },
      { id: 62, name: 'Al-Jumu\'ah', translation: 'The Congregation' },
      { id: 63, name: 'Al-Munafiqun', translation: 'The Hypocrites' },
      { id: 64, name: 'At-Taghabun', translation: 'The Mutual Disillusion' },
      { id: 65, name: 'At-Talaq', translation: 'The Divorce' },
      { id: 66, name: 'At-Tahrim', translation: 'The Prohibition' },
      { id: 67, name: 'Al-Mulk', translation: 'The Sovereignty' },
      { id: 68, name: 'Al-Qalam', translation: 'The Pen' },
      { id: 69, name: 'Al-Haqqah', translation: 'The Reality' },
      { id: 70, name: 'Al-Ma\'arij', translation: 'The Ascending Stairways' },
      { id: 71, name: 'Nuh', translation: 'Noah' },
      { id: 72, name: 'Al-Jinn', translation: 'The Jinn' },
      { id: 73, name: 'Al-Muzzammil', translation: 'The Enshrouded One' },
      { id: 74, name: 'Al-Muddaththir', translation: 'The Cloaked One' },
      { id: 75, name: 'Al-Qiyamah', translation: 'The Resurrection' },
      { id: 76, name: 'Al-Insan', translation: 'The Man' },
      { id: 77, name: 'Al-Mursalat', translation: 'The Emissaries' },
      { id: 78, name: 'An-Naba', translation: 'The Tidings' },
      { id: 79, name: 'An-Nazi\'at', translation: 'Those who drag forth' },
      { id: 80, name: 'Abasa', translation: 'He Frowned' },
      { id: 81, name: 'At-Takwir', translation: 'The Overthrowing' },
      { id: 82, name: 'Al-Infitar', translation: 'The Cleaving' },
      { id: 83, name: 'Al-Mutaffifin', translation: 'The Defrauding' },
      { id: 84, name: 'Al-Inshiqaq', translation: 'The Splitting Open' },
      { id: 85, name: 'Al-Buruj', translation: 'The Mansions of the Stars' },
      { id: 86, name: 'At-Tariq', translation: 'The Morning Star' },
      { id: 87, name: 'Al-A\'la', translation: 'The Most High' },
      { id: 88, name: 'Al-Ghashiyah', translation: 'The Overwhelming' },
      { id: 89, name: 'Al-Fajr', translation: 'The Dawn' },
      { id: 90, name: 'Al-Balad', translation: 'The City' },
      { id: 91, name: 'Ash-Shams', translation: 'The Sun' },
      { id: 92, name: 'Al-Layl', translation: 'The Night' },
      { id: 93, name: 'Ad-Duhaa', translation: 'The Morning Hours' },
      { id: 94, name: 'Ash-Sharh', translation: 'The Relief' },
      { id: 95, name: 'At-Tin', translation: 'The Fig' },
      { id: 96, name: 'Al-\'Alaq', translation: 'The Clot' },
      { id: 97, name: 'Al-Qadr', translation: 'The Power' },
      { id: 98, name: 'Al-Bayyinah', translation: 'The Clear Proof' },
      { id: 99, name: 'Az-Zalzalah', translation: 'The Earthquake' },
      { id: 100, name: 'Al-\'Adiyat', translation: 'The Courser' },
      { id: 101, name: 'Al-Qari\'ah', translation: 'The Calamity' },
      { id: 102, name: 'At-Takathur', translation: 'The Rivalry in world increase' },
      { id: 103, name: 'Al-\'Asr', translation: 'The Declining Day' },
      { id: 104, name: 'Al-Humazah', translation: 'The Traducer' },
      { id: 105, name: 'Al-Fil', translation: 'The Elephant' },
      { id: 106, name: 'Quraysh', translation: 'Quraysh' },
      { id: 107, name: 'Al-Ma\'un', translation: 'The Small kindnesses' },
      { id: 108, name: 'Al-Kawthar', translation: 'The Abundance' },
      { id: 109, name: 'Al-Kafirun', translation: 'The Disbelievers' },
      { id: 110, name: 'An-Nasr', translation: 'The Divine Support' },
      { id: 111, name: 'Al-Masad', translation: 'The Palm Fiber' },
      { id: 112, name: 'Al-Ikhlas', translation: 'The Sincerity' },
      { id: 113, name: 'Al-Falaq', translation: 'The Daybreak' },
      { id: 114, name: 'An-Nas', translation: 'Mankind' }
    ];

    if (this.elements.surahSelect) {
      surahs.forEach(surah => {
        const option = document.createElement('option');
        option.value = surah.id;
        option.textContent = `${surah.id}. ${surah.name} - ${surah.translation}`;
        this.elements.surahSelect.appendChild(option);
      });
    }
  }

  /**
   * Show loading indicator
   */
  showLoading() {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = 'flex';
    }
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = 'none';
    }
  }

  /**
   * Handle Get Surah button click
   */
  async handleGetSurah() {
    const surahId = this.elements.surahSelect?.value;
    const lang = this.elements.surahLangSelect?.value || 'ar';

    if (!surahId) {
      this.displayError(this.elements.surahDisplay, 'Please select a Surah');
      return;
    }

    await this.getSurah(surahId, lang);
  }

  /**
   * Fetch and display a complete Surah
   * @param {number|string} id - Surah ID (1-114)
   * @param {string} lang - Language code ('ar' or 'en')
   */
  async getSurah(id, lang = 'ar') {
    try {
      console.log(`Fetching Surah ${id} in ${lang}...`);
      this.showLoading();

      // Clear previous display
      if (this.elements.surahDisplay) {
        this.elements.surahDisplay.innerHTML = '';
      }

      // Make API request
      const endpoint = `/content/quran/surah/${id}?lang=${lang}`;
      const response = await this.api.get(endpoint);

      console.log('Surah data received:', response);

      // Store current Surah
      this.currentSurah = response;

      // Display the Surah
      this.displaySurah(response, lang);

    } catch (error) {
      console.error('Error fetching Surah:', error);
      this.displayError(
        this.elements.surahDisplay,
        `Failed to fetch Surah: ${error.message}`
      );
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Display a Surah with proper formatting
   * @param {Object} surahData - The Surah data from API
   * @param {string} lang - Language code
   */
  displaySurah(surahData, lang) {
    if (!this.elements.surahDisplay) return;

    const isArabic = lang === 'ar';

    // Create container
    const container = document.createElement('div');
    container.className = `surah-container ${isArabic ? 'rtl' : 'ltr'}`;

    // Surah header
    const header = document.createElement('div');
    header.className = 'surah-header';

    const title = document.createElement('h2');
    title.className = isArabic ? 'arabic-text' : '';
    title.textContent = surahData.name || `Surah ${surahData.id}`;

    const metadata = document.createElement('div');
    metadata.className = 'surah-metadata';
    metadata.innerHTML = `
      <span class="metadata-item">Surah ${surahData.id}</span>
      ${surahData.transliteration ? `<span class="metadata-item">${surahData.transliteration}</span>` : ''}
      ${surahData.translation ? `<span class="metadata-item">${surahData.translation}</span>` : ''}
      ${surahData.ayah_count ? `<span class="metadata-item">${surahData.ayah_count} Ayahs</span>` : ''}
      ${surahData.type ? `<span class="metadata-item">${surahData.type}</span>` : ''}
    `;

    header.appendChild(title);
    header.appendChild(metadata);
    container.appendChild(header);

    // Bismillah (for all Surahs except At-Tawbah - Surah 9)
    if (surahData.id !== 9 && isArabic) {
      const bismillah = document.createElement('div');
      bismillah.className = 'bismillah arabic-text';
      bismillah.textContent = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
      container.appendChild(bismillah);
    }

    // Ayahs container
    const ayahsContainer = document.createElement('div');
    ayahsContainer.className = 'ayahs-container';

    // Display ayahs
    if (surahData.verses && Array.isArray(surahData.verses)) {
      surahData.verses.forEach(verse => {
        const ayahDiv = document.createElement('div');
        ayahDiv.className = 'ayah-item';

        const ayahNumber = document.createElement('span');
        ayahNumber.className = 'ayah-number';
        ayahNumber.textContent = verse.verse_number || verse.id;

        const ayahText = document.createElement('p');
        ayahText.className = isArabic ? 'ayah-text arabic-text' : 'ayah-text';
        ayahText.textContent = verse.text;

        ayahDiv.appendChild(ayahNumber);
        ayahDiv.appendChild(ayahText);

        // Add translation if available
        if (verse.translation && lang === 'en') {
          const translation = document.createElement('p');
          translation.className = 'ayah-translation';
          translation.textContent = verse.translation;
          ayahDiv.appendChild(translation);
        }

        ayahsContainer.appendChild(ayahDiv);
      });
    } else if (surahData.ayahs && Array.isArray(surahData.ayahs)) {
      // Alternative structure
      surahData.ayahs.forEach(ayah => {
        const ayahDiv = document.createElement('div');
        ayahDiv.className = 'ayah-item';

        const ayahNumber = document.createElement('span');
        ayahNumber.className = 'ayah-number';
        ayahNumber.textContent = ayah.id || ayah.numberInSurah || ayah.number;

        const ayahText = document.createElement('p');
        ayahText.className = isArabic ? 'ayah-text arabic-text' : 'ayah-text';
        ayahText.textContent = ayah.text;

        ayahDiv.appendChild(ayahNumber);
        ayahDiv.appendChild(ayahText);
        ayahsContainer.appendChild(ayahDiv);
      });
    }

    container.appendChild(ayahsContainer);

    // Clear and append
    this.elements.surahDisplay.innerHTML = '';
    this.elements.surahDisplay.appendChild(container);

    console.log('Surah displayed successfully');
  }

  /**
   * Handle Search button click
   */
  async handleSearch() {
    const query = this.elements.searchInput?.value?.trim();
    const lang = this.elements.searchLangSelect?.value || 'ar';
    const limit = parseInt(this.elements.searchLimitInput?.value) || 10;

    if (!query) {
      this.displayError(this.elements.searchResults, 'Please enter a search query');
      return;
    }

    await this.searchQuran(query, lang, limit);
  }

  /**
   * Search the Quran text
   * @param {string} query - Search query
   * @param {string} lang - Language code ('ar' or 'en')
   * @param {number} limit - Maximum number of results
   */
  async searchQuran(query, lang = 'ar', limit = 10) {
    try {
      console.log(`Searching Quran for "${query}" in ${lang}...`);
      this.showLoading();

      // Clear previous results
      if (this.elements.searchResults) {
        this.elements.searchResults.innerHTML = '';
      }

      // Make API request
      const endpoint = `/content/quran/search?q=${encodeURIComponent(query)}&lang=${lang}&limit=${limit}`;
      const response = await this.api.get(endpoint);

      console.log('Search results received:', response);

      // Check if response is empty or has no results
      if (!response || (!response.results && !response.verses) ||
          (response.results && response.results.length === 0) ||
          (response.verses && response.verses.length === 0)) {
        this.displayError(
          this.elements.searchResults,
          `⚠️ Search feature is currently not available on the backend. Please try loading Surahs directly instead.`
        );
        return;
      }

      // Store results
      this.searchResults = response;

      // Display results
      this.displaySearchResults(response, query, lang);

    } catch (error) {
      console.error('Error searching Quran:', error);
      this.displayError(
        this.elements.searchResults,
        `⚠️ Search feature is currently not available. Error: ${error.message}`
      );
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Display search results with highlighting
   * @param {Object} resultsData - Search results from API
   * @param {string} query - Original search query
   * @param {string} lang - Language code
   */
  displaySearchResults(resultsData, query, lang) {
    if (!this.elements.searchResults) return;

    const isArabic = lang === 'ar';

    // Create container
    const container = document.createElement('div');
    container.className = 'search-results-container';

    // Results header
    const header = document.createElement('div');
    header.className = 'search-header';

    const results = resultsData.results || resultsData.verses || [];
    const totalCount = resultsData.total || results.length;

    header.innerHTML = `
      <h3>Search Results</h3>
      <p class="search-meta">Found ${totalCount} result(s) for "${query}"</p>
    `;

    container.appendChild(header);

    // Display results
    if (results.length === 0) {
      const noResults = document.createElement('p');
      noResults.className = 'no-results';
      noResults.textContent = 'No results found. Try a different search term.';
      container.appendChild(noResults);
    } else {
      const resultsList = document.createElement('div');
      resultsList.className = 'results-list';

      results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${isArabic ? 'rtl' : 'ltr'}`;

        // Reference
        const reference = document.createElement('div');
        reference.className = 'result-reference';
        reference.textContent = `${result.surah_name || `Surah ${result.surah_id}`} ${result.verse_number || result.ayah_number}`;

        // Text with highlighting
        const text = document.createElement('p');
        text.className = isArabic ? 'result-text arabic-text' : 'result-text';
        text.innerHTML = this.highlightText(result.text, query);

        resultItem.appendChild(reference);
        resultItem.appendChild(text);

        // Add translation if available
        if (result.translation) {
          const translation = document.createElement('p');
          translation.className = 'result-translation';
          translation.innerHTML = this.highlightText(result.translation, query);
          resultItem.appendChild(translation);
        }

        // Make clickable to load full Surah
        resultItem.style.cursor = 'pointer';
        resultItem.addEventListener('click', () => {
          this.getSurah(result.surah_id, lang);
          // Scroll to Surah display
          this.elements.surahDisplay?.scrollIntoView({ behavior: 'smooth' });
        });

        resultsList.appendChild(resultItem);
      });

      container.appendChild(resultsList);
    }

    // Clear and append
    this.elements.searchResults.innerHTML = '';
    this.elements.searchResults.appendChild(container);

    console.log('Search results displayed successfully');
  }

  /**
   * Highlight search terms in text
   * @param {string} text - The text to highlight
   * @param {string} query - The search query
   * @returns {string} HTML string with highlighted terms
   */
  highlightText(text, query) {
    if (!text || !query) return text;

    // Escape special regex characters in query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create case-insensitive regex
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    // Replace matches with highlighted spans
    return text.replace(regex, '<mark class="highlight">$1</mark>');
  }

  /**
   * Handle Get Ayah button click
   */
  async handleGetAyah() {
    const surahId = this.elements.ayahSurahInput?.value;
    const ayahNumber = this.elements.ayahNumberInput?.value;
    const lang = this.elements.ayahLangSelect?.value || 'ar';

    if (!surahId || !ayahNumber) {
      this.displayError(this.elements.ayahDisplay, 'Please enter Surah and Ayah numbers');
      return;
    }

    await this.getAyah(surahId, ayahNumber, lang);
  }

  /**
   * Get a specific Ayah
   * @param {number|string} surahId - Surah ID
   * @param {number|string} ayahNumber - Ayah number
   * @param {string} lang - Language code
   */
  async getAyah(surahId, ayahNumber, lang = 'ar') {
    try {
      console.log(`Fetching Ayah ${surahId}:${ayahNumber} in ${lang}...`);
      this.showLoading();

      // Clear previous display
      if (this.elements.ayahDisplay) {
        this.elements.ayahDisplay.innerHTML = '';
      }

      // Make API request
      const endpoint = `/content/quran/ayah?surah=${surahId}&ayah=${ayahNumber}&lang=${lang}`;
      const response = await this.api.get(endpoint);

      console.log('Ayah data received:', response);

      // Display the Ayah
      this.displayAyah(response, lang);

    } catch (error) {
      console.error('Error fetching Ayah:', error);

      // Check if it's a 404 error
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        this.displayError(
          this.elements.ayahDisplay,
          `⚠️ Get specific Ayah feature is currently not available. Please load the complete Surah instead and browse to the Ayah you need.`
        );
      } else {
        this.displayError(
          this.elements.ayahDisplay,
          `Failed to fetch Ayah: ${error.message}`
        );
      }
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Display a specific Ayah
   * @param {Object} ayahData - Ayah data from API
   * @param {string} lang - Language code
   */
  displayAyah(ayahData, lang) {
    if (!this.elements.ayahDisplay) return;

    const isArabic = lang === 'ar';

    // Create container
    const container = document.createElement('div');
    container.className = `ayah-display-container ${isArabic ? 'rtl' : 'ltr'}`;

    // Reference
    const reference = document.createElement('div');
    reference.className = 'ayah-reference';
    reference.innerHTML = `
      <h3>${ayahData.surah_name || `Surah ${ayahData.surah_id}`}</h3>
      <p>Ayah ${ayahData.verse_number || ayahData.ayah_number}</p>
    `;

    // Text
    const text = document.createElement('p');
    text.className = isArabic ? 'ayah-display-text arabic-text' : 'ayah-display-text';
    text.textContent = ayahData.text;

    container.appendChild(reference);
    container.appendChild(text);

    // Add translation if available
    if (ayahData.translation) {
      const translation = document.createElement('p');
      translation.className = 'ayah-display-translation';
      translation.textContent = ayahData.translation;
      container.appendChild(translation);
    }

    // Metadata
    if (ayahData.revelation_type || ayahData.juz) {
      const metadata = document.createElement('div');
      metadata.className = 'ayah-metadata';
      if (ayahData.revelation_type) {
        metadata.innerHTML += `<span>Type: ${ayahData.revelation_type}</span>`;
      }
      if (ayahData.juz) {
        metadata.innerHTML += `<span>Juz: ${ayahData.juz}</span>`;
      }
      container.appendChild(metadata);
    }

    // Clear and append
    this.elements.ayahDisplay.innerHTML = '';
    this.elements.ayahDisplay.appendChild(container);

    console.log('Ayah displayed successfully');
  }

  /**
   * Display an error message
   * @param {HTMLElement} element - Element to display error in
   * @param {string} message - Error message
   */
  displayError(element, message) {
    if (!element) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <span class="error-icon">⚠️</span>
      <span class="error-text">${message}</span>
    `;

    element.innerHTML = '';
    element.appendChild(errorDiv);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuranTester;
}
