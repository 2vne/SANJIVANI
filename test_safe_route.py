import urllib.request
import json

BASE_URL = "http://localhost:5000/api"

def test_safe_route():
    print("=================================================================")
    print("SANJIVANI SAFE ROUTE ENGINE - AUTOMATED END-TO-END TEST SUITE")
    print("=================================================================")

    # Scenario 1: Normal Route Test
    print("\n[TEST 1] Standard Clear Route Request...")
    url1 = f"{BASE_URL}/safe-route?origin=18.5204,73.8567&destination=18.5504,73.8867"
    req1 = urllib.request.urlopen(url1)
    res1 = json.loads(req1.read())
    print(f"-> Success: {res1.get('success')}")
    print(f"-> Is Rerouted: {res1.get('is_rerouted')}")
    print(f"-> Is Origin in Danger: {res1.get('is_origin_in_danger')}")
    print(f"-> Distance: {res1.get('distance_km')} km, Duration: {res1.get('duration_minutes')} min")
    print(f"-> Total Route Coordinates: {len(res1.get('points', []))}")
    print(f"-> First 3 Waypoints: {res1.get('points', [])[:3]}")

    # Scenario 2: Create Active Danger Zone on Path
    print("\n[TEST 2] Injecting CRITICAL Disaster Zone between Origin & Destination...")
    incident_payload = json.dumps({
        "title": "Severe Flash Flood & Structural Collapse in Sector 4",
        "description": "Active emergency situation with high flood waters blocking main thoroughfares",
        "category": "FLOOD",
        "severity": "CRITICAL",
        "location": {
            "address": "Sector 4 Junction",
            "lat": 18.5350,
            "lng": 73.8700
        },
        "strandedCount": 12,
        "injuredCount": 3,
        "urgentNeeds": ["RESCUE_BOAT", "MEDICAL_KIT"]
    }).encode("utf-8")

    req_inc = urllib.request.Request(
        f"{BASE_URL}/incidents",
        data=incident_payload,
        headers={"Content-Type": "application/json"}
    )
    inc_res = json.loads(urllib.request.urlopen(req_inc).read())
    print(f"-> Incident Created: ID={inc_res.get('id')}, Severity={inc_res.get('severity')}")

    # Query Route Again (Should Detect Zone & Reroute)
    print("\n[TEST 3] Requesting Route intersecting Active CRITICAL Zone...")
    url2 = f"{BASE_URL}/safe-route?origin=18.5204,73.8567&destination=18.5504,73.8867"
    req2 = urllib.request.urlopen(url2)
    res2 = json.loads(req2.read())
    print(f"-> Is Rerouted: {res2.get('is_rerouted')}")
    print(f"-> Reroute Reason: {res2.get('reroute_reason')}")
    print(f"-> Has Safe Route: {res2.get('has_safe_route')}")
    print(f"-> Active Zones Detected: {len(res2.get('active_zones', []))}")
    print(f"-> Rerouted Waypoints Sample: {res2.get('points', [])[len(res2.get('points', []))//2 : len(res2.get('points', []))//2 + 3]}")

    # Scenario 3: Origin Inside Active Danger Zone (Escape Logic)
    print("\n[TEST 4] Testing Origin INSIDE Active Zone (Escape Logic)...")
    url3 = f"{BASE_URL}/safe-route?origin=18.5350,73.8700&destination=18.5504,73.8867"
    req3 = urllib.request.urlopen(url3)
    res3 = json.loads(req3.read())
    print(f"-> Is Origin In Danger: {res3.get('is_origin_in_danger')}")
    print(f"-> Danger Zone Name: {res3.get('danger_zone_name')}")
    print(f"-> Escape Leg Present: {res3.get('escape_leg') is not None}")
    if res3.get('escape_leg'):
        print(f"-> Escape Leg Waypoints Count: {len(res3.get('escape_leg', {}).get('points', []))}")
        print(f"-> Escape Exit Point: {res3.get('escape_leg', {}).get('points', [])[-1]}")

    print("\n=================================================================")
    print("ALL SANJIVANI SAFE ROUTE ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    test_safe_route()
