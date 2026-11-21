--------------------------- MODULE WidgetRefresh ---------------------------
CONSTANT SkipFreshnessCheck

VARIABLES current, queued, submitted, expectedAtHandoff

NoSnapshot == [reviews |-> "none", theme |-> "none", language |-> "none"]

Init ==
    /\ current \in [reviews: {"none", "earlier"}, theme: {"miku"}, language: {"en"}]
    /\ queued = NoSnapshot
    /\ submitted = NoSnapshot
    /\ expectedAtHandoff = NoSnapshot

ChangeReviews ==
    /\ current.reviews # "later"
    /\ current' = [current EXCEPT !.reviews = "later"]
    /\ UNCHANGED <<queued, submitted, expectedAtHandoff>>

ChangeTheme ==
    /\ current.theme = "miku"
    /\ current' = [current EXCEPT !.theme = "emilia"]
    /\ UNCHANGED <<queued, submitted, expectedAtHandoff>>

ChangeLanguage ==
    /\ current.language = "en"
    /\ current' = [current EXCEPT !.language = "ru"]
    /\ UNCHANGED <<queued, submitted, expectedAtHandoff>>

QueuePublication ==
    /\ current.reviews # "none"
    /\ queued = NoSnapshot
    /\ queued' = current
    /\ UNCHANGED <<current, submitted, expectedAtHandoff>>

SubmitSnapshot ==
    /\ queued # NoSnapshot
    /\ submitted' = IF SkipFreshnessCheck THEN queued ELSE current
    /\ expectedAtHandoff' = current
    /\ queued' = NoSnapshot
    /\ UNCHANGED current

Next == ChangeReviews \/ ChangeTheme \/ ChangeLanguage \/ QueuePublication \/ SubmitSnapshot

NoStalePublication == submitted = expectedAtHandoff

=============================================================================
