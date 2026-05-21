from ai_stock_radar.market_data import _crowd_risk


def test_crowd_risk_high_for_large_short_term_move() -> None:
    assert _crowd_risk(40.0, 45.0, 60.0) == "High"


def test_crowd_risk_medium_for_moderate_move() -> None:
    assert _crowd_risk(20.0, 25.0, 30.0) == "Medium"


def test_crowd_risk_low_for_small_move() -> None:
    assert _crowd_risk(5.0, 12.0, 20.0) == "Low"
