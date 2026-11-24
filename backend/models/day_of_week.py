from enum import Enum, auto

# Do not change the order of the days of the week or the values assigned to them,
# if you do, it will break data integrity in the database.
class DayOfWeek(Enum):
	MONDAY 	  = auto()
	TUESDAY   = auto()
	WEDNESDAY = auto()
	THURSDAY  = auto()
	FRIDAY 	  = auto()
	SATURDAY  = auto()
	SUNDAY    = auto()
