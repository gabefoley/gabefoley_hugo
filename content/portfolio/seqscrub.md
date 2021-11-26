---
title: "SeqScrub"
image: "images/portfolio/seqscrub_again.png"
client: "Thomson"
year: "2019"
language: "PHP"
description: "This is meta description."
category: "Research"
project_url: "https://www.gabefoley.com/SeqScrub"
type: "portfolio"
draft: false
---

SeqScrub is a web tool that takes in FASTA file headers and cleans them, either by

- completely removing everything except the unique ID
- removing certain characters (user can supply these)
- adding in additional useful taxonomic information


The user has control over the output format and ordering of the different elements.

SeqScrub is novel in that it doesn't search for information within the given headers, but queries external databases such as the NCBI and UniProt databases in order to rebuild the headers with the most current, accurate information.

Because of these external queries SeqScrub can also check if a record is obsolete.


<a href="https://www.gabefoley.com/SeqScrub"> SeqScrub can be accessed here </a>