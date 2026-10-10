# PostGIS

PostGIS is a Geographic Information System (GIS) extension for PostgreSQL. It adds support for
geographic objects allowing location queries to be run in SQL.

## SRIDs

Spatial Reference System Identifiers (SRIDs) are unique identifiers associated with specific
coordinate systems. They define how the coordinates of spatial data relate to locations on the
Earth's surface.

### Relevant SRIDs

| SRID | Coordinate Type | Units |
| --- | --- | --- |
| 0  or -1 | Planar / Cartesian | None |
| 4326 | Geographic (Latitude / Longitude) | Decimal Degrees |
| 3857 | Projected (Flat Map) | Meters |

## Geometry Types

### Points

A point is a pair or coordinates (x, y) that represents a single location in space.

#### Creating a Point Column

```python
from geoalchemy2 import Geometry

point: Mapped[Geometry] = Column(Geometry(geometry_type='POINT', srid=4326))
```

#### Seeding a Point Column

```python
db.execute(insert(ExampleModel).values(point='SRID=4326;POINT(-71.060316 48.432044)'))
```

### Lines

A line, or linestring, is a series of points connected by straight segments. A linestring can be
made up of 1, 2, 3, or more points. It can represent paths, roads, or any linear feature.

#### Creating a Line Column

```python
from geoalchemy2 import Geometry

line: Mapped[Geometry] = Column(Geometry(geometry_type='LINESTRING', srid=4326))
```

#### Seeding a Line Column

```python
# A linestring with two points
db.execute(insert(ExampleModel).values(
    line='SRID=4326;LINESTRING(-71.060316 48.432044, -71.061316 48.433044)'
))

# A linestring with three points
db.execute(insert(ExampleModel).values(
    line='SRID=4326;LINESTRING(-71.060316 48.432044, -71.061316 48.433044, -71.062316 48.434044)'
))
```

### Polygons

A polygon is a closed shape defined by a series of points. It can represent areas such as
buildings, parks, or any enclosed space.

#### Creating a Polygon Column

```python
from geoalchemy2 import Geometry

polygon: Mapped[Geometry] = Column(Geometry(geometry_type='POLYGON', srid=4326))
```

#### Seeding a Polygon Column

```python
# A polygon with four points (a square)
db.execute(insert(ExampleModel).values(
    polygon='SRID=4326;POLYGON((-71.060316 48.432044, -71.061316 48.432044, -71.061316 48.433044, -71.060316 48.433044, -71.060316 48.432044))'
))

# A polygon with five points (a pentagon)
db.execute(insert(ExampleModel).values(
    polygon='SRID=4326;POLYGON((-71.060316 48.432044, -71.061316 48.432044, -71.061316 48.433044, -71.060316 48.433044, -71.060316 48.432044, -71.059316 48.432544))'
))
```

### MultiPoints

MultiPoints are collections of points. They can represent multiple locations in a single geometry.

#### Creating a MultiPoint Column

```python
from geoalchemy2 import Geometry

multipoint: Mapped[Geometry] = Column(Geometry(geometry_type='MULTIPOINT', srid=4326))
```

#### Seeding a MultiPoint Column

```python
# A multipoint with two points
db.execute(insert(ExampleModel).values(
    multipoint='SRID=4326;MULTIPOINT((-71.060316 48.432044, -71.061316 48.433044))'
))

# A multipoint with three points
db.execute(insert(ExampleModel).values(
    multipoint='SRID=4326;MULTIPOINT((-71.060316 48.432044, -71.061316 48.433044, -71.062316 48.434044))'
))
```

### MultiLines

MultiLines are collections of lines, or linestrings. They can represent multiple paths or roads in
a single geometry.

#### Creating a MultiLine Column

```python
from geoalchemy2 import Geometry

multiline: Mapped[Geometry] = Column(Geometry(geometry_type='MULTILINESTRING', srid=4326))
```

#### Seeding a MultiLine Column

```python
# A multiline with two lines
db.execute(insert(ExampleModel).values(
    multiline='SRID=4326;MULTILINESTRING((-71.060316 48.432044, -71.061316 48.433044), (-71.062316 48.434044, -71.063316 48.435044))'
))

# A multiline with three lines
db.execute(insert(ExampleModel).values(
    multiline='SRID=4326;MULTILINESTRING((-71.060316 48.432044, -71.061316 48.433044), (-71.062316 48.434044, -71.063316 48.435044), (-71.064316 48.436044, -71.065316 48.437044))'
))
```

### MultiPolygons

MultiPolygons are collections of polygons. They can represent multiple areas or regions in a single
geometry.

#### Creating a MultiPolygon Column

```python
from geoalchemy2 import Geometry

multipolygon: Mapped[Geometry] = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326))
```

#### Seeding a MultiPolygon Column

```python
# A multipolygon with two polygons
db.execute(insert(ExampleModel).values(
    multipolygon='SRID=4326;MULTIPOLYGON(((-71.060316 48.432044, -71.061316 48.432044, -71.061316 48.433044, -71.060316 48.433044, -71.060316 48.432044)), ((-71.062316 48.434044, -71.063316 48.434044, -71.063316 48.435044, -71.062316 48.435044, -71.062316 48.434044)))'
))
```

### Geometry Collections

Geometry Collections are collections of different geometry types. They can represent complex
spatial features that consist of multiple geometry types.

#### Creating a Geometry Collection Column

```python
from geoalchemy2 import Geometry

geometry_collection: Mapped[Geometry] = Column(Geometry(geometry_type='GEOMETRYCOLLECTION', srid=4326))
```

#### Seeding a Geometry Collection Column

```python
# A geometry collection with a point and a linestring
db.execute(insert(ExampleModel).values(
    geometry_collection='SRID=4326;GEOMETRYCOLLECTION(POINT(-71.060316 48.432044), LINESTRING(-71.061316 48.433044, -71.062316 48.434044))'
))

# A geometry collection with a polygon and a multipoint
db.execute(insert(ExampleModel).values(
    geometry_collection='SRID=4326;GEOMETRYCOLLECTION(POLYGON((-71.060316 48.432044, -71.061316 48.432044, -71.061316 48.433044, -71.060316 48.433044, -71.060316 48.432044)), MULTIPOINT((-71.062316 48.434044, -71.063316 48.435044)))'
))
```

### Spatial Indexing

To improve the performance of spatial queries, you can create a spatial index on geometry columns
using the `GIST` index type.

#### Creating a Spatial Index

```python
from sqlalchemy import Index

Index('idx_example_model_point', ExampleModel.point, postgresql_using='gist')
```

#### Creating a Spatial Index in Alembic Migration

```python
from alembic import op
import sqlalchemy as sa

op.create_index('idx_example_model_point', 'example_model', ['point'], postgresql_using='gist')
```

#### Using the Spatial Index

Once the spatial index is created, PostgreSQL will automatically use it to optimize spatial queries
involving the indexed geometry column.

## How to Store GIS Data in Python Once it has been Queried from the Database

```python
from geoalchemy2.elements import WKBElement
from geoalchemy2.shape import to_shape
from shapely.geometry.base import BaseGeometry

# Query the database for a model instance that contains a PostGIS geometry column
example_geometry_var: ExampleModel = db.query(ExampleModel).first()

# Access the WKBElement from the PostGIS variable (geom is the name of the PostGIS geometry column
# in the ExampleModel class).
raw_gis_data: WKBElement = example_geometry_var.geom

# Convert the WKBElement to a usable Shapely geometry object (idk if this will be needed).
converted_gis_data: BaseGeometry = to_shape(raw_gis_data)
```

## How to Store GIS Data in TypeScript

```ts
import { Geometry } from "geojson";

let exampleGeometryVar: Geometry = {
  type: "Point",
  coordinates: [-71.060316, 48.432044],
};
```

## How to Display GIS Data in React Leaflet

```tsx
import { MapContainer, Marker } from "react-leaflet";
import { Geometry } from "geojson";

const ExampleMap: React.FC = () => {
    const exampleGeometryVar: Geometry = {
        type: "Point",
        coordinates: [-71.060316, 48.432044],
    };

    const coordinates: [number, number] = exampleGeometryVar.coordinates as [number, number];

  return (
    <MapContainer center={coordinates}>
      <Marker position={coordinates} />
    </MapContainer>
  );
};
```
