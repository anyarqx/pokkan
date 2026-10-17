# Square Cloud application commits overlay the previous release. Ignore Rails
# framework directories which this API intentionally does not load, even if a
# file from an older full-stack Rails release remains on the volume.
Rails.autoloaders.main.ignore(
  Rails.root.join("app/jobs"),
  Rails.root.join("app/mailers")
)
