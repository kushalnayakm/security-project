import { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const MINT_BORDER = "#2FBF9B";
const MINT_FILL = "#D6FBF5";

export function GoogleMapsLocationPicker({ open, onClose, onSelect, initialQuery }) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiError, setApiError] = useState("");
  const [searchText, setSearchText] = useState(initialQuery || "");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [geocodingError, setGeocodingError] = useState("");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const searchInputRef = useRef(null);

  // Load Google Maps script
  useEffect(() => {
    if (!open) return;
    if (!GOOGLE_MAPS_API_KEY) {
      setApiError("Google Maps configuration missing.");
      return;
    }

    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setMapLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setMapLoaded(true);
        }
      });
      existingScript.addEventListener("error", () => {
        setApiError("Failed to load Google Maps. Please check your API key.");
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setMapLoaded(true);
      } else {
        setApiError("Google Maps failed to initialize.");
      }
    };

    script.onerror = () => {
      setApiError("Failed to load Google Maps. Please check your API key.");
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount - it may be used elsewhere
    };
  }, [open]);

  // Initialize map once loaded
  useEffect(() => {
    if (!mapLoaded || !open || !mapRef.current) return;

    const defaultCenter = { lat: 12.9344, lng: 77.5146 }; // Bengaluru default

    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      },
    });

    mapInstanceRef.current = map;

    // Initialize Places Autocomplete
    if (searchInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        types: ["geocode", "establishment"],
        fields: ["formatted_address", "geometry", "name", "place_id"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
          setGeocodingError("No location details available for this place. Please try another search.");
          return;
        }

        setGeocodingError("");
        setSelectedPlace({
          formatted_address: place.formatted_address || place.name,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });

        // Update map
        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
        }

        // Place marker
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }
        markerRef.current = new window.google.maps.Marker({
          map,
          position: place.geometry.location,
          animation: window.google.maps.Animation.DROP,
        });
      });

      autocompleteRef.current = autocomplete;
    }

    // Click on map to select location via reverse geocoding
    map.addListener("click", async (e) => {
      setGeocodingError("");
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Place marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      markerRef.current = new window.google.maps.Marker({
        map,
        position: e.latLng,
        animation: window.google.maps.Animation.DROP,
      });

      // Reverse geocode
      try {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: e.latLng });

        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          setSelectedPlace({
            formatted_address: result.formatted_address,
            latitude: lat,
            longitude: lng,
          });
        } else {
          setSelectedPlace({
            formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            latitude: lat,
            longitude: lng,
          });
        }
      } catch {
        setSelectedPlace({
          formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          latitude: lat,
          longitude: lng,
        });
      }
    });

    // Try to geolocate user
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.setCenter(pos);
        },
        () => {
          // Silently fail - use default center
        },
      );
    }
  }, [mapLoaded, open]);

  const handleConfirm = () => {
    if (!selectedPlace) return;
    onSelect({
      formatted: selectedPlace.formatted_address,
      lat: String(selectedPlace.latitude),
      lng: String(selectedPlace.longitude),
    });
    onClose();
  };

  const handleClose = () => {
    // Clean up marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Select Location</h2>
          <button onClick={handleClose} style={styles.closeBtn} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Error states */}
        {apiError && (
          <div style={styles.errorBanner}>
            <p style={styles.errorText}>{apiError}</p>
          </div>
        )}

        {!apiError && !mapLoaded && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading Google Maps...</p>
          </div>
        )}

        {/* Map content */}
        {mapLoaded && !apiError && (
          <>
            {/* Search bar */}
            <div style={styles.searchBar}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search for a place or address..."
                style={styles.searchInput}
              />
            </div>

            {geocodingError && (
              <div style={styles.geocodeError}>{geocodingError}</div>
            )}

            {/* Map */}
            <div style={styles.mapContainer}>
              <div ref={mapRef} style={styles.map}></div>
            </div>

            {/* Selected place display */}
            {selectedPlace && (
              <div style={styles.selectedInfo}>
                <div style={styles.selectedLabel}>Selected Location:</div>
                <div style={styles.selectedAddress}>{selectedPlace.formatted_address}</div>
              </div>
            )}

            {/* Hint */}
            {!selectedPlace && (
              <div style={styles.hint}>
                Search for a place or click directly on the map to select a location.
              </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              <button onClick={handleClose} style={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedPlace}
                style={{
                  ...styles.confirmBtn,
                  ...(!selectedPlace ? styles.confirmBtnDisabled : {}),
                }}
              >
                Confirm Location
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    width: "100%",
    maxWidth: "700px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
    borderBottom: `2px solid ${MINT_BORDER}`,
    background: MINT_FILL,
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#0F6E56",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "1.25rem",
    cursor: "pointer",
    color: "#0F6E56",
    padding: "0.25rem 0.5rem",
    lineHeight: 1,
  },
  errorBanner: {
    padding: "1rem 1.25rem",
    background: "#FEF2F2",
    borderBottom: "1px solid #FECACA",
  },
  errorText: {
    color: "#DC2626",
    fontSize: "0.875rem",
    margin: 0,
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1rem",
    gap: "1rem",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #E5E7EB",
    borderTopColor: "#0F6E56",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#0F6E56",
    fontSize: "0.9rem",
    margin: 0,
  },
  searchBar: {
    padding: "0.75rem 1.25rem",
    borderBottom: "1px solid #E5E7EB",
  },
  searchInput: {
    width: "100%",
    padding: "0.65rem 0.75rem",
    border: `2px solid ${MINT_BORDER}`,
    borderRadius: "4px",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  },
  geocodeError: {
    padding: "0.5rem 1.25rem",
    color: "#DC2626",
    fontSize: "0.8rem",
    background: "#FEF2F2",
  },
  mapContainer: {
    flex: 1,
    minHeight: "350px",
    position: "relative",
  },
  map: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  selectedInfo: {
    padding: "0.75rem 1.25rem",
    background: "#ECFDF5",
    borderTop: `1px solid ${MINT_BORDER}`,
  },
  selectedLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#0F6E56",
    marginBottom: "0.25rem",
  },
  selectedAddress: {
    fontSize: "0.875rem",
    color: "#333",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  hint: {
    padding: "0.75rem 1.25rem",
    fontSize: "0.8rem",
    color: "#6B7280",
    textAlign: "center",
    borderTop: "1px solid #E5E7EB",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
    borderTop: `2px solid ${MINT_BORDER}`,
    background: MINT_FILL,
  },
  cancelBtn: {
    padding: "0.6rem 1.25rem",
    background: "transparent",
    color: "#0F6E56",
    border: `1px solid ${MINT_BORDER}`,
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmBtn: {
    padding: "0.6rem 1.5rem",
    background: "#0F6E56",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmBtnDisabled: {
    background: "#9CA3AF",
    cursor: "not-allowed",
  },
};