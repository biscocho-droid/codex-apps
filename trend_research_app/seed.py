from __future__ import annotations

from typing import List

from .models import Exposure, TrendDefinition


def default_trends() -> List[TrendDefinition]:
    return [
        TrendDefinition(
            slug="chatgpt",
            keyword="chatgpt",
            category="internet",
            thesis="Consumer and enterprise AI attention can spill into infrastructure and software winners.",
            benchmark_ticker="QQQ",
            exposures=[
                Exposure("MSFT", "beneficiary", "Platform distribution and enterprise AI monetization."),
                Exposure("NVDA", "beneficiary", "AI compute demand and infrastructure bottleneck exposure."),
                Exposure("GOOGL", "beneficiary", "Search and model platform response to generative AI adoption."),
            ],
        ),
        TrendDefinition(
            slug="ozempic",
            keyword="ozempic",
            category="health",
            thesis="GLP-1 demand can identify direct therapeutic winners before adjacent effects are fully priced.",
            benchmark_ticker="XLV",
            exposures=[
                Exposure("LLY", "beneficiary", "Direct obesity and diabetes drug exposure."),
                Exposure("NVO", "beneficiary", "Direct obesity and diabetes drug exposure."),
            ],
        ),
        TrendDefinition(
            slug="sports-betting",
            keyword="sports betting",
            category="consumer",
            thesis="Search intensity can track legalization and adoption waves in online betting.",
            benchmark_ticker="XLY",
            exposures=[
                Exposure("DKNG", "beneficiary", "Pure-play online sports betting exposure."),
                Exposure("FLUT", "beneficiary", "Large-scale sports betting and iGaming exposure."),
            ],
        ),
        TrendDefinition(
            slug="robotaxi",
            keyword="robotaxi",
            category="internet",
            thesis="Autonomy attention can influence expectations around mobility and AI platform adoption.",
            benchmark_ticker="QQQ",
            exposures=[
                Exposure("TSLA", "beneficiary", "Direct robotaxi narrative and autonomy optionality exposure."),
            ],
        ),
        TrendDefinition(
            slug="weight-loss-drugs",
            keyword="weight loss drugs",
            category="health",
            thesis="Broader anti-obesity attention can identify second-order healthcare and consumer effects.",
            benchmark_ticker="XLV",
            exposures=[
                Exposure("LLY", "beneficiary", "Large-cap anti-obesity leadership and prescribing leverage."),
                Exposure("NVO", "beneficiary", "Large-cap anti-obesity leadership and prescribing leverage."),
            ],
        ),
        TrendDefinition(
            slug="ulta-beauty",
            keyword="ulta beauty",
            category="beauty",
            thesis="Beauty demand attention can surface category resilience and premium consumer spending.",
            benchmark_ticker="XRT",
            exposures=[
                Exposure("ULTA", "beneficiary", "Direct prestige beauty retail exposure."),
                Exposure("EL", "beneficiary", "Prestige beauty demand and category read-through."),
            ],
        ),
        TrendDefinition(
            slug="protein-soda",
            keyword="protein soda",
            category="food",
            thesis="Functional-beverage attention can reveal emerging consumer taste shifts before broad sell-side coverage.",
            benchmark_ticker="XLP",
            exposures=[
                Exposure("PEP", "beneficiary", "Better-for-you beverage adjacency and distribution scale."),
                Exposure("MNST", "beneficiary", "Functional beverage adjacency and innovation leverage."),
                Exposure("CELH", "beneficiary", "Health-oriented beverage brand read-through."),
            ],
        ),
    ]


def excluded_trends() -> List[TrendDefinition]:
    return [
        TrendDefinition(
            slug="temu",
            keyword="temu",
            category="retail",
            thesis="Cross-border ecommerce attention can signal share shifts and consumer spending behavior.",
            benchmark_ticker="XLY",
            exposures=[
                Exposure("PDD", "beneficiary", "Direct ownership of the Temu platform."),
                Exposure("AMZN", "risk", "Competitive pressure and consumer share-of-wallet risk."),
            ],
        ),
        TrendDefinition(
            slug="cruise",
            keyword="cruise",
            category="travel",
            thesis="Travel-intent spikes can precede demand normalization for listed cruise operators.",
            benchmark_ticker="JETS",
            exposures=[
                Exposure("RCL", "beneficiary", "Direct cruise demand exposure."),
                Exposure("CCL", "beneficiary", "Direct cruise demand exposure."),
                Exposure("NCLH", "beneficiary", "Direct cruise demand exposure."),
            ],
        ),
        TrendDefinition(
            slug="uber-eats",
            keyword="uber eats",
            category="internet",
            thesis="Food delivery demand can surface platform share and consumer convenience spending shifts.",
            benchmark_ticker="QQQ",
            exposures=[
                Exposure("UBER", "beneficiary", "Delivery platform leverage and cross-sell scale."),
                Exposure("DASH", "beneficiary", "Pure-play food delivery and local commerce exposure."),
            ],
        ),
        TrendDefinition(
            slug="airbnb",
            keyword="airbnb",
            category="travel",
            thesis="Alternative-accommodation intent can precede travel mix shifts and platform demand strength.",
            benchmark_ticker="JETS",
            exposures=[
                Exposure("ABNB", "beneficiary", "Direct short-stay platform exposure."),
                Exposure("BKNG", "beneficiary", "Online travel demand and accommodation mix exposure."),
            ],
        ),
        TrendDefinition(
            slug="pilates",
            keyword="pilates",
            category="fitness",
            thesis="Fitness modality attention can identify demand shifts across activewear and wellness spending.",
            benchmark_ticker="XLY",
            exposures=[
                Exposure("LULU", "beneficiary", "Premium activewear and wellness lifestyle leverage."),
                Exposure("ONON", "beneficiary", "Premium movement and training-adjacent consumer brand exposure."),
            ],
        ),
        TrendDefinition(
            slug="sephora",
            keyword="sephora",
            category="beauty",
            thesis="Beauty retailer attention can signal category momentum and consumer discretionary resilience.",
            benchmark_ticker="XLP",
            exposures=[
                Exposure("EL", "beneficiary", "Prestige beauty demand read-through."),
                Exposure("ULTA", "risk", "Competitive share pressure within beauty specialty retail."),
            ],
        ),
        TrendDefinition(
            slug="klarna",
            keyword="klarna",
            category="consumer",
            thesis="BNPL attention can track consumer credit appetite and payment-behavior shifts.",
            benchmark_ticker="XLF",
            exposures=[
                Exposure("AFRM", "beneficiary", "Direct BNPL platform exposure."),
                Exposure("PYPL", "beneficiary", "Checkout financing and payment-volume read-through."),
            ],
        ),
    ]
