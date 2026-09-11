import math
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI
from ..models.schemas import AIAssessment, Incident
from ..config import OPENAI_API_KEY

_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY and "your_openai" not in OPENAI_API_KEY else None

class NeedsAssessmentAgent:
    """
    Pure mathematical Priority and Severity Zone Scoring calculation.
    Formula: zone_score = log10(people_affected) * weight_A + disaster_type + urgency_keyword_score
    """

    @classmethod
    def calculate_zone_score(cls, incident_data: Dict[str, Any], weight_a: float = 20.0) -> Dict[str, Any]:
        trapped = max(0, int(incident_data.get("peopleTrapped") or 0))
        injured = max(0, int(incident_data.get("injured") or 0))
        raw_affected = incident_data.get("peopleAffected") or (trapped + injured)
        people_affected = max(1, int(raw_affected))

        # 1. log10(people_affected) * weight_A
        log_val = math.log10(people_affected)
        people_affected_score = round(log_val * weight_a, 1)

        # 2. Disaster Type Base Score
        disaster_type_score = 15.0
        cat = str(incident_data.get("category", "")).upper()
        if cat in ["EARTHQUAKE", "STRUCTURAL_COLLAPSE", "HAZMAT"]:
            disaster_type_score = 30.0
        elif cat in ["FLOOD", "WILDFIRE", "MEDICAL_EMERGENCY"]:
            disaster_type_score = 25.0
        elif cat in ["LANDSLIDE", "POWER_OUTAGE"]:
            disaster_type_score = 20.0

        # 3. Urgency Keyword Score from text description & title
        text = f"{incident_data.get('title', '')} {incident_data.get('description', '')}".lower()
        critical_keywords = [
            "trapped", "critical", "explosion", "submerged", "bleeding", "toxic",
            "collapse", "icu", "raging", "drowning", "fatalities", "urgent",
            "life-threatening", "catastrophic", "overwhelmed", "severe", "flattened"
        ]
        high_keywords = [
            "injured", "fire", "smoke", "hazmat", "landslide", "flood", "outage",
            "damaged", "marooned", "blocked", "leak", "rescue", "evacuate", "panic",
            "medical", "hospital", "unconscious"
        ]
        mod_keywords = [
            "help", "water", "power", "shelter", "supplies", "request", "food", "need", "assistance"
        ]

        detected_keywords: List[str] = []
        urgency_keyword_score = 0.0

        for kw in critical_keywords:
            if kw in text:
                urgency_keyword_score += 5.0
                detected_keywords.append(kw)

        for kw in high_keywords:
            if kw in text and kw not in detected_keywords:
                urgency_keyword_score += 3.0
                detected_keywords.append(kw)

        for kw in mod_keywords:
            if kw in text and kw not in detected_keywords:
                urgency_keyword_score += 1.0
                detected_keywords.append(kw)

        zone_score = round(people_affected_score + disaster_type_score + urgency_keyword_score, 1)
        priority_score = min(100, max(1, round(zone_score)))

        return {
            "zoneScore": zone_score,
            "priorityScore": priority_score,
            "peopleAffectedScore": people_affected_score,
            "disasterTypeScore": disaster_type_score,
            "urgencyKeywordScore": urgency_keyword_score,
            "detectedKeywords": detected_keywords,
            "peopleAffected": people_affected,
        }

    @classmethod
    async def assess_incident_async(cls, incident_data: Dict[str, Any]) -> AIAssessment:
        math_calc = cls.calculate_zone_score(incident_data)

        if _openai_client:
            try:
                prompt = f"""You are the PS20 Emergency Priority & Severity Zone Scoring AI Agent.
Calculate and verify the disaster zone score using the exact mathematical formula:
zone_score = log10(people_affected) * weight_A + disaster_type + urgency_keyword_score

Incident Details:
Title: {incident_data.get('title', 'Emergency Incident')}
Category: {incident_data.get('category', 'FLOOD')}
Severity: {incident_data.get('severity', 'HIGH')}
Description: {incident_data.get('description', 'N/A')}
People Affected: {math_calc['peopleAffected']} (Trapped: {incident_data.get('peopleTrapped', 0)}, Injured: {incident_data.get('injured', 0)})
Location: Lat {incident_data.get('latitude')}, Lon {incident_data.get('longitude')}

Calculated Math Components:
- log10(people_affected) * weight_A (weight_A=20): {math_calc['peopleAffectedScore']}
- Disaster Type Base Score: {math_calc['disasterTypeScore']}
- Urgency Keywords Detected: {', '.join(math_calc['detectedKeywords']) or 'None'} (Score: {math_calc['urgencyKeywordScore']})
- Total Mathematical Zone Score: {math_calc['zoneScore']}

Return a JSON object with:
- zoneScore: float equal to total formula score
- priorityScore: integer from 1 to 100 representing life-safety urgency
- peopleAffectedScore: float
- disasterTypeScore: float
- urgencyKeywordScore: float
- detectedKeywords: array of urgency keywords
- recommendedResourceTypes: array of matching resource types from ['SEARCH_RESCUE', 'MEDICAL_UNIT', 'WATER_VESSEL', 'HELICOPTER', 'HEAVY_EQUIPMENT', 'SUPPLY_CONVOY']
- urgencyReasoning: explicit mathematical breakdown text"""

                response = await _openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": "You are an expert emergency logistics AI triage agent. Respond ONLY in valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2
                )
                content = response.choices[0].message.content
                if content:
                    parsed = json.loads(content)
                    return AIAssessment(
                        priorityScore=min(100, max(1, int(parsed.get("priorityScore") or math_calc["priorityScore"]))),
                        zoneScore=float(parsed.get("zoneScore", math_calc["zoneScore"])),
                        peopleAffectedScore=float(parsed.get("peopleAffectedScore", math_calc["peopleAffectedScore"])),
                        disasterTypeScore=float(parsed.get("disasterTypeScore", math_calc["disasterTypeScore"])),
                        urgencyKeywordScore=float(parsed.get("urgencyKeywordScore", math_calc["urgencyKeywordScore"])),
                        detectedKeywords=parsed.get("detectedKeywords", math_calc["detectedKeywords"]),
                        recommendedResourceTypes=parsed.get("recommendedResourceTypes", ["SEARCH_RESCUE"]),
                        urgencyReasoning=parsed.get("urgencyReasoning") or f"Math: zone_score = log10({math_calc['peopleAffected']})*20 ({math_calc['peopleAffectedScore']}) + type ({math_calc['disasterTypeScore']}) + keywords ({math_calc['urgencyKeywordScore']}) = {math_calc['zoneScore']}",
                        assessedAt=datetime.now(timezone.utc).isoformat(),
                        agentModel="OpenAI GPT-4o-mini"
                    )
            except Exception as e:
                print(f"[NeedsAssessmentAgent] OpenAI Live Agent failed ({e}), using deterministic math engine.")

        return cls.assess_incident(incident_data)

    @classmethod
    def assess_incident(cls, incident_data: Dict[str, Any]) -> AIAssessment:
        math_calc = cls.calculate_zone_score(incident_data)
        recommended_types = set()

        trapped = int(incident_data.get("peopleTrapped") or 0)
        injured = int(incident_data.get("injured") or 0)

        if trapped > 0:
            recommended_types.add("SEARCH_RESCUE")
        if injured > 0:
            recommended_types.add("MEDICAL_UNIT")

        cat = str(incident_data.get("category", "")).upper()
        if cat == "FLOOD":
            recommended_types.add("WATER_VESSEL")
            recommended_types.add("HELICOPTER")
            if trapped > 5:
                recommended_types.add("SEARCH_RESCUE")
        elif cat == "POWER_OUTAGE":
            recommended_types.add("SUPPLY_CONVOY")
            recommended_types.add("MEDICAL_UNIT")
        elif cat in ["LANDSLIDE", "STRUCTURAL_COLLAPSE"]:
            recommended_types.add("HEAVY_EQUIPMENT")
            recommended_types.add("SEARCH_RESCUE")
        elif cat in ["HAZMAT", "WILDFIRE"]:
            recommended_types.add("SEARCH_RESCUE")
            recommended_types.add("MEDICAL_UNIT")
        else:
            recommended_types.add("SEARCH_RESCUE")

        reasoning = f"Zone Score Breakdown: log10({math_calc['peopleAffected']})x20 [{math_calc['peopleAffectedScore']}] + {cat or 'FLOOD'} type [{math_calc['disasterTypeScore']}] + Urgency Keywords [{math_calc['urgencyKeywordScore']}] ({', '.join(math_calc['detectedKeywords']) or 'none'}) = {math_calc['zoneScore']}"

        return AIAssessment(
            priorityScore=math_calc["priorityScore"],
            zoneScore=math_calc["zoneScore"],
            peopleAffectedScore=math_calc["peopleAffectedScore"],
            disasterTypeScore=math_calc["disasterTypeScore"],
            urgencyKeywordScore=math_calc["urgencyKeywordScore"],
            detectedKeywords=math_calc["detectedKeywords"],
            recommendedResourceTypes=list(recommended_types),
            urgencyReasoning=reasoning,
            assessedAt=datetime.now(timezone.utc).isoformat(),
            agentModel="Mathematical Zone Scoring Engine"
        )
