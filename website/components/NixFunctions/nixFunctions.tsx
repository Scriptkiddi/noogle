import { Box } from "@mui/system";
import { useEffect, useMemo } from "react";
import { PageState } from "../../models/internals";
import { byType, pipe } from "../../queries";
import { DocItem } from "../../models/nix";
import { BasicList, BasicListItem } from "../basicList";
import FunctionItem from "../functionItem/functionItem";
import { SetPageStateVariable } from "../pageContext";
import { useMiniSearch } from "react-minisearch";

interface FunctionsProps {
  pageState: PageState;
  setPageStateVariable: SetPageStateVariable;
}

export function NixFunctions(props: FunctionsProps) {
  const { pageState, setPageStateVariable } = props;
  const { data, selected, term, filter } = pageState;

  const setSelected = setPageStateVariable<string | null>("selected");

  const { search, searchResults, rawResults } = useMiniSearch<DocItem>(data, {
    fields: ["id", "name", "category", "description", "example", "fn_type"],
    searchOptions: {
      // allow 22% levenshtein distance (e.g. 2.2 of 10 characters don't match)
      fuzzy: 0.22,
      // prefer to show builtins first
      boostDocument: (id, term) => {
        let boost = 1;
        boost *= id.includes("builtins") ? 10 : 1;
        boost *= id.includes(term) ? 10 : 1;
        return boost;
      },
      boost: {
        id: 1000,
        name: 100,
        category: 10,
        example: 0.5,
        fn_type: 10,
        description: 1,
      },
    },
    tokenize: (text: string, fieldName): string[] => {
      //split the text into words
      const wordTokens = text.split(/\W/);
      const containsUpper = (w: string) => Boolean(w.match(/[A-Z]/)?.length);
      const tokens = [
        // include the words itself if they contain upperCharacters
        // mapAttrs -> mapAttrs
        ...wordTokens.filter(containsUpper),
        // but also split words that contain uppercase
        // mapAttrs -> [map, Attrs]
        ...wordTokens
          .filter(containsUpper)
          .map((t) => t.split(/(?=[A-Z])/))
          .flat(),
        // just include lowercase words without further tokenizing
        // map -> map
        ...wordTokens.filter((w) => !containsUpper(w)),
      ];
      return tokens;
    },
  });

  //initial site-load is safe to call
  useEffect(() => {
    search(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    const dataForFilter = term ? searchResults || [] : data;
    console.debug({ rawResults });
    return pipe(byType(filter))(dataForFilter);
  }, [filter, term, rawResults, searchResults, data]);

  const preRenderedItems: BasicListItem[] = filteredData.map(
    (docItem: DocItem) => {
      const key = docItem.id;
      const matches = rawResults?.find((r) => r.id === docItem.id)?.terms || [];
      return {
        item: (
          <Box
            sx={{
              width: "100%",
              height: "100%",
            }}
            onClick={!(selected === key) ? () => setSelected(key) : undefined}
          >
            <FunctionItem
              markWords={matches}
              name={docItem.name}
              docItem={docItem}
              selected={selected === key}
              handleClose={() => setSelected(null)}
            />
          </Box>
        ),
        key,
      };
    }
  );

  return (
    <Box sx={{ ml: { xs: 0, md: 2 } }}>
      <BasicList items={preRenderedItems} search={search} />
    </Box>
  );
}
