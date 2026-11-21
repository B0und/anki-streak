--------------------------- MODULE WidgetRefresh ---------------------------
CONSTANT SkipFreshnessCheck

VARIABLES current, queued, submitted, expectedAtHandoff

NoSnapshot == [reviews |-> "none", theme |-> "none", language |-> "none", questTarget |-> "none"]

Init ==
    /\ current \in [reviews: {"none", "earlier"}, theme: {"miku"}, language: {"en"}, questTarget: {"initial"}]
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

ChangeQuestTarget ==
    /\ current.questTarget = "initial"
    /\ current' = [current EXCEPT !.questTarget = "edited"]
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

Next == ChangeReviews \/ ChangeTheme \/ ChangeLanguage \/ ChangeQuestTarget \/ QueuePublication \/ SubmitSnapshot

NoStalePublication == submitted = expectedAtHandoff

=============================================================================
