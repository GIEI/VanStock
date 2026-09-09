<?php
// Thin wrapper: serve the same template as the Italian homepage, in English.
// PHP resolves the relative includes inside index.php against index.php's own
// directory, so no markup is duplicated here.
require __DIR__ . '/../index.php';
