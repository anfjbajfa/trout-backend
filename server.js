const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/api/filter-locations", async (req, res) => {
  try {
    const filters = req.body;

    //         Sending JSON to backend: {
    //   "easeUseCode": "1121",
    //   "distanceFromLakes": {
    //     "distance": 1000
    //   },
    //   "troutStreamClasses": [
    //     "Class One",
    //     "Class Two"
    //   ],
    //   "location": "89.2,45.6"
    // }
    const params = [
      filters.easeUseCodes,
      filters.distanceFromLakes.distance,
      filters.troutStreamClasses, // e.g., ['Class One', 'Class Two']
      filters.location.lng,
      filters.location.lat
    ];

    console.log(params)

    const sqlQuery = `
           SELECT
    p.objectid,
    p.lms_boat_landing_name,
    p.ownership_manager_name_text,
    ST_AsGeoJSON(p.geom) AS geometry
FROM
    public_boat_access_sites AS p
WHERE
    EXISTS (
        SELECT 1
        FROM dnr_managed_land_parcels AS d
        WHERE d.ease_use_code = ANY($1::integer[])
          AND p.geom && d.geom                          
          AND ST_Intersects(p.geom, d.geom)
    )
    AND NOT EXISTS (
        SELECT 1
        FROM impaired_lakes AS l
        WHERE ST_DWithin(p.geom::geography, l.geom::geography, $2)
    )
    AND EXISTS (
        SELECT 1
        FROM classified_trout_stream_lines AS t
        WHERE t.trout_class_code = ANY($3)
          AND ST_DWithin(p.geom::geography, t.geom::geography, 5000) 
    )
ORDER BY
    ST_Distance(
        p.geom::geography,
        ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography
    ) ASC
LIMIT 5;
        `;
    console.log("With Params:", params);

    // record time
  const startTime = Date.now();

  const { rows } = await db.query(sqlQuery, params);

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Query consumes: ${duration} ms`);

 
const startTime1 = Date.now();
    // take query into GeoJSON FeatureCollection
    const geoJsonFeatureCollection = {
      type: "FeatureCollection",
      features: rows.map((row) => ({
        type: "Feature",
        geometry: JSON.parse(row.geometry),
        properties: {
          objectid: row.objectid,
          boat_landing_name:row.lms_boat_landing_name,
          owernship:row.ownership_manager_name_text,
        },
      })),
    };
    console.log(geoJsonFeatureCollection)

    res.json(geoJsonFeatureCollection);

    const endTime1 = Date.now();
  const duration1 = endTime1 - startTime1;

  console.log(`time consuming: ${duration1} ms`);
  } catch (error) {
    console.error("Error processing filter request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
