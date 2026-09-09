<?php
// Thin wrapper: serve the same template as the Italian privacy page, in English.
// PHP resolves the relative includes inside privacy.php against privacy.php's own
// directory, so no markup is duplicated here.
require __DIR__ . '/../privacy.php';
