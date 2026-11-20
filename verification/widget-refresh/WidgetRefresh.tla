--------------------------- MODULE WidgetRefresh ---------------------------
CONSTANT SkipFreshnessCheck

VARIABLES current, rendering, submitted, expectedAtHandoff

NoArtwork == [reviews |-> "none", theme |-> "none", language |-> "none"]

Init ==
    /\ current = [reviews |-> "earlier", theme |-> "miku", language |-> "en"]
    /\ rendering = NoArtwork
    /\ submitted = NoArtwork
    /\ expectedAtHandoff = NoArtwork

ChangeReviews ==
    /\ current.reviews = "earlier"
    /\ current' = [current EXCEPT !.reviews = "later"]
    /\ UNCHANGED <<rendering, submitted, expectedAtHandoff>>

ChangeTheme ==
    /\ current.theme = "miku"
    /\ current' = [current EXCEPT !.theme = "emilia"]
    /\ UNCHANGED <<rendering, submitted, expectedAtHandoff>>

ChangeLanguage ==
    /\ current.language = "en"
    /\ current' = [current EXCEPT !.language = "ru"]
    /\ UNCHANGED <<rendering, submitted, expectedAtHandoff>>

StartRender ==
    /\ rendering = NoArtwork
    /\ rendering' = current
    /\ UNCHANGED <<current, submitted, expectedAtHandoff>>

RestartStaleRender ==
    /\ ~SkipFreshnessCheck
    /\ rendering # NoArtwork
    /\ rendering # current
    /\ rendering' = current
    /\ UNCHANGED <<current, submitted, expectedAtHandoff>>

SubmitSnapshot ==
    /\ rendering # NoArtwork
    /\ SkipFreshnessCheck \/ rendering = current
    /\ submitted' = rendering
    /\ expectedAtHandoff' = current
    /\ rendering' = NoArtwork
    /\ UNCHANGED current

Next == ChangeReviews \/ ChangeTheme \/ ChangeLanguage \/ StartRender
        \/ RestartStaleRender \/ SubmitSnapshot

NoStalePublication == submitted = expectedAtHandoff

=============================================================================
